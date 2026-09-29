// SVG-Ansicht des Strips in der Form, wie er haengt. Modus "layout": Ecken per Zeiger
// verschiebbar. Modus "paint": Werkzeug "brush" faerbt Segmente per Tippen/Ziehen
// (Event segment-paint), Werkzeug "range" waehlt einen Bereich per Ziehen oder zwei
// Tipps (Event segment-range). Treffer auch neben dem Balken -- fuer Finger.
// Zwei Finger zoomen und verschieben (bricht einen angefangenen Strich ab: paint-cancel);
// dazu Trackpad-Pinch (Wheel mit ctrlKey).
import { LitElement, css, html, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { boundingBox, computeSegments, cornerRange, nearestSegment, type Box, type Layout } from "./geometry";
import { clientToSvg, placeView, zoomAt, zoomOf, type Rect } from "./zoom";


export interface RangeDetail {
  from: number;
  to: number;
}

export interface CornerMoveDetail {
  corner: number; // Position in layout.corners
  index: number; // neues Segment
}

@customElement("sbs-strip-view")
export class StripView extends LitElement {
  @property({ attribute: false }) layout!: Layout;
  @property({ attribute: false }) colors: string[] | null = null;
  @property({ type: Number }) selected = -1;
  @property({ reflect: true }) mode: "layout" | "paint" | "view" = "layout";
  @property() tool: "brush" | "range" = "brush";

  private dragging = -1;
  private painting = false;
  private lastPainted = -1;
  /** Bereich: Startsegment und aktuelles Ende; waitingTap = Anfang getippt, Ende folgt. */
  @state() private anchor = -1;
  @state() private rangeEnd = -1;
  private waitingTap = false;
  /** Segment unter dem Finger -- als Blase angezeigt. */
  @state() private pointerAt = -1;
  /** Sichtbarer Ausschnitt; null = Gesamtansicht. */
  @state() private view: Box | null = null;
  private base: Box = { x: 0, y: 0, width: 1, height: 1 };
  private touches = new Map<number, { x: number; y: number }>();
  /** Laufende Zwei-Finger-Geste; bleibt bis alle Finger weg sind. */
  private pinch: { p: { x: number; y: number }; d0: number; z0: number } | null = null;

  static styles = css`
    :host { display: block; }
    .wrap { position: relative; }
    /* pan-y: Wischen neben dem Strip scrollt die Seite; auf Segmenten/Griffen blockiert
       onTouchStart das Scrollen (iOS respektiert touch-action allein nicht zuverlaessig). */
    svg { width: 100%; max-height: var(--sbs-strip-max-height, 60vh); touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    :host([mode="view"]) svg { touch-action: auto; }
    .seg { stroke: var(--divider-color, #0003); stroke-width: 0.04; }
    .seg.in-range { stroke: var(--primary-color, #03a9f4); stroke-width: 0.14; }
    .bubble rect { fill: var(--primary-text-color, #000); opacity: 0.85; }
    .bubble text { fill: var(--primary-background-color, #fff); font-size: 0.9px; font-weight: 600; text-anchor: middle; dominant-baseline: central; }
    .handle { fill: none; stroke: var(--primary-text-color, #000); stroke-width: 0.12; cursor: grab; }
    .handle.selected { stroke: var(--primary-color, #03a9f4); stroke-width: 0.2; }
    .hit { fill: transparent; cursor: grab; }
    .anchor { fill: none; stroke: var(--primary-color, #03a9f4); stroke-width: 0.16; stroke-dasharray: 0.3 0.2; }
    :host([mode="paint"]) .seg { cursor: crosshair; }
    text { font-size: 0.7px; fill: var(--secondary-text-color, #666); font-family: sans-serif; }
  `;

  private toSvgPoint(ev: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const el = this.renderRoot.querySelector("svg");
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  private onDown(ev: PointerEvent, corner: number) {
    this.dragging = corner;
    (ev.target as Element).setPointerCapture(ev.pointerId);
    this.dispatchEvent(new CustomEvent("corner-select", { detail: corner }));
  }

  /** Segment unter dem Zeiger; Finger duerfen deutlich danebenliegen. -1 = keins. */
  private hit(ev: { clientX: number; clientY: number; pointerType?: string }): number {
    const pt = this.toSvgPoint(ev);
    if (!pt) return -1;
    const segs = computeSegments(this.layout);
    const index = nearestSegment(segs, pt.x, pt.y);
    const s = segs[index];
    const reach = ev.pointerType === "mouse" ? 0.8 : 1.6;
    return (s.x - pt.x) ** 2 + (s.y - pt.y) ** 2 <= reach ** 2 ? index : -1;
  }

  // Nicht-passive Touch-Listener: nur so laesst sich Scrollen auf iOS sicher verhindern.
  private readonly onTouchStart = (ev: TouchEvent) => {
    if (ev.touches.length >= 2) {
      ev.preventDefault(); // eigene Zoom-Geste statt Seiten-Zoom/-Scroll
      return;
    }
    const touch = ev.touches[0];
    if (!touch) return;
    const onHandle = (ev.target as Element).classList?.contains("hit");
    if ((this.mode === "paint" && this.hit(touch) >= 0) || (this.mode === "layout" && onHandle)) ev.preventDefault();
  };

  private readonly onTouchMove = (ev: TouchEvent) => {
    if (this.painting || this.dragging >= 0 || this.pinch || ev.touches.length >= 2) ev.preventDefault();
  };

  private readonly onWheel = (ev: WheelEvent) => {
    if (!ev.ctrlKey) return; // Trackpad-Pinch kommt als Wheel mit ctrlKey
    ev.preventDefault();
    this.zoomBy(Math.exp(-ev.deltaY * 0.01), ev.clientX, ev.clientY);
  };

  private get rect(): Rect | null {
    return this.renderRoot.querySelector("svg")?.getBoundingClientRect() ?? null;
  }

  private zoomBy(factor: number, x: number, y: number) {
    const rect = this.rect;
    if (!rect) return;
    this.setView(zoomAt(this.base, this.view ?? this.base, rect, factor, x, y));
  }

  private setView(view: Box) {
    this.view = zoomOf(this.base, view) <= 1.001 ? null : view;
  }

  private startPinch() {
    // Angefangenen Strich/Bereich/Eckzug verwerfen -- der erste Finger war Teil der Geste.
    if (this.painting && this.tool === "brush" && this.lastPainted >= 0) {
      this.dispatchEvent(new CustomEvent("paint-cancel"));
    }
    this.painting = false;
    this.dragging = -1;
    this.pointerAt = -1;
    this.clearRange();
    const rect = this.rect;
    const [a, b] = [...this.touches.values()];
    if (!rect || !a || !b) return;
    const view = this.view ?? this.base;
    this.pinch = {
      p: clientToSvg(view, rect, (a.x + b.x) / 2, (a.y + b.y) / 2),
      d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      z0: zoomOf(this.base, view),
    };
  }

  private movePinch() {
    const rect = this.rect;
    const [a, b] = [...this.touches.values()];
    if (!this.pinch || !rect || !a || !b) return;
    const zoom = (this.pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / this.pinch.d0;
    this.setView(placeView(this.base, rect, zoom, this.pinch.p, (a.x + b.x) / 2, (a.y + b.y) / 2));
  }

  protected firstUpdated() {
    const el = this.renderRoot.querySelector("svg");
    el?.addEventListener("touchstart", this.onTouchStart, { passive: false });
    el?.addEventListener("touchmove", this.onTouchMove, { passive: false });
    el?.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private paintAt(ev: PointerEvent) {
    const index = this.hit(ev);
    if (index < 0) return;
    this.pointerAt = index;
    if (this.tool === "range") {
      this.rangeEnd = index;
      return;
    }
    if (index === this.lastPainted) return;
    this.lastPainted = index;
    this.dispatchEvent(new CustomEvent("segment-paint", { detail: index }));
  }

  private onSvgDown(ev: PointerEvent) {
    if (ev.pointerType === "touch") {
      this.touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
      if (this.touches.size === 2) return this.startPinch();
      if (this.touches.size > 2 || this.pinch) return;
    }
    if (this.mode !== "paint") return;
    const index = this.hit(ev);
    if (index < 0) return;
    this.painting = true;
    this.lastPainted = -1;
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    if (this.tool === "range") {
      if (this.waitingTap) {
        this.emitRange(this.anchor, index);
        this.painting = false;
        return;
      }
      this.anchor = index;
    }
    this.paintAt(ev);
  }

  private emitRange(a: number, b: number) {
    const detail: RangeDetail = { from: Math.min(a, b), to: Math.max(a, b) };
    this.dispatchEvent(new CustomEvent("segment-range", { detail }));
    this.clearRange();
  }

  /** Halb gewaehlten Bereich verwerfen (z.B. beim Werkzeugwechsel). */
  clearRange() {
    this.anchor = this.rangeEnd = -1;
    this.waitingTap = false;
  }

  private onMove(ev: PointerEvent) {
    if (this.touches.has(ev.pointerId)) this.touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (this.pinch) return this.movePinch();
    if (this.painting) return this.paintAt(ev);
    if (this.dragging < 0) return;
    const pt = this.toSvgPoint(ev);
    if (!pt) return;
    const [min, max] = cornerRange(this.layout, this.dragging);
    const index = nearestSegment(computeSegments(this.layout), pt.x, pt.y, min, max);
    if (index !== this.layout.corners[this.dragging].index) {
      const detail: CornerMoveDetail = { corner: this.dragging, index };
      this.dispatchEvent(new CustomEvent("corner-move", { detail }));
    }
  }

  private onUp(ev: PointerEvent) {
    this.touches.delete(ev.pointerId);
    if (this.pinch) {
      if (this.touches.size === 0) this.pinch = null;
      return;
    }
    this.dragging = -1;
    this.pointerAt = -1;
    if (!this.painting) return;
    this.painting = false;
    if (this.tool === "range" && this.anchor >= 0) {
      // Gezogen -> fertig; nur getippt -> auf den zweiten Tipp warten.
      if (this.rangeEnd !== this.anchor) this.emitRange(this.anchor, this.rangeEnd);
      else this.waitingTap = true;
      return;
    }
    this.dispatchEvent(new CustomEvent("paint-end"));
  }

  private renderBubble(segs: ReturnType<typeof computeSegments>) {
    const s = segs[this.pointerAt];
    if (!s) return nothing;
    // Ueber dem Finger, damit er sie nicht verdeckt.
    return svg`<g class="bubble" transform="translate(${s.x} ${s.y - 2})">
      <rect x="-1.1" y="-0.6" width="2.2" height="1.2" rx="0.4"></rect>
      <text>${s.index + 1}</text>
    </g>`;
  }

  private inRange(index: number): boolean {
    if (this.anchor < 0 || this.rangeEnd < 0) return false;
    return index >= Math.min(this.anchor, this.rangeEnd) && index <= Math.max(this.anchor, this.rangeEnd);
  }

  render() {
    const segs = computeSegments(this.layout);
    this.base = boundingBox(segs);
    const view = this.view ?? this.base;
    const labelEvery = zoomOf(this.base, view) >= 3 ? 5 : 10;
    const cornerAt = new Map(this.layout.corners.map((c, i) => [c.index, i]));
    return html`<div class="wrap"><svg
      viewBox="${view.x} ${view.y} ${view.width} ${view.height}"
      @pointerdown=${this.onSvgDown}
      @pointermove=${this.onMove}
      @pointerup=${this.onUp}
      @pointercancel=${this.onUp}
    >
      ${segs.map(
        (s) => svg`<rect class="seg ${this.inRange(s.index) ? "in-range" : ""}" x="-0.46" y="-0.34" width="0.92" height="0.68" rx="0.14"
          fill="${this.colors?.[s.index] ? `#${this.colors[s.index]}` : "var(--disabled-color, #bbb)"}"
          transform="translate(${s.x} ${s.y}) rotate(${s.angle})"><title>#${s.index + 1}</title></rect>`,
      )}
      ${segs
        .filter((s) => s.index === 0 || (s.index + 1) % labelEvery === 0)
        .map((s) => svg`<text x="${s.x + 0.6}" y="${s.y - 0.6}">${s.index + 1}</text>`)}
      ${segs
        .filter((s) => this.mode === "layout" && cornerAt.has(s.index))
        .map((s) => {
          const i = cornerAt.get(s.index)!;
          return svg`<circle class="handle ${i === this.selected ? "selected" : ""}" cx="${s.x}" cy="${s.y}" r="0.85"></circle>
            <circle class="hit" cx="${s.x}" cy="${s.y}" r="1.8" @pointerdown=${(ev: PointerEvent) => this.onDown(ev, i)}></circle>`;
        })}
      ${this.waitingTap && segs[this.anchor]
        ? svg`<circle class="anchor" cx="${segs[this.anchor].x}" cy="${segs[this.anchor].y}" r="0.8"></circle>`
        : nothing}
      ${this.renderBubble(segs)}
    </svg></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sbs-strip-view": StripView;
  }
}
