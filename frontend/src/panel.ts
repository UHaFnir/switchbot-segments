// Seitenleisten-Panel „Lightstrips“: Layout (Startrichtung, Ecken) bearbeiten und am
// echten Strip kalibrieren; Segmente live einfaerben und als Presets speichern. Registriert von custom_components/switchbot_segments/panel.py.
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import * as api from "./api";
import { addCorner, calibrationColors, cornerRange, type Direction, type Layout } from "./geometry";
import { translator } from "./i18n";
import type { CornerMoveDetail, RangeDetail } from "./strip-view";
import "./strip-view";
import "./light-picker";
import "./template-picker";
import type { TemplateRequest } from "./template-picker";

const DIRECTIONS: [Direction, string][] = [
  ["up", "↑"],
  ["right", "→"],
  ["down", "↓"],
  ["left", "←"],
];
const PREVIEW_DEBOUNCE_MS = 250;
const MAX_SWATCHES = 12;

type Mode = "layout" | "paint";

@customElement("switchbot-segments-panel")
export class SwitchbotSegmentsPanel extends LitElement {
  @property({ attribute: false }) hass!: api.Hass;
  @property({ type: Boolean }) narrow = false;

  @state() private strips: api.StripInfo[] = [];
  @state() private selectedId = "";
  @state() private draft: Layout | null = null;
  @state() private dirty = false;
  @state() private selectedCorner = -1;
  @state() private calibrating = false;
  @state() private busy = false;
  @state() private message = "";
  @state() private mode: Mode = "layout";
  @state() private paintColors: string[] | null = null;
  @state() private brush = "ff0000";
  @state() private presetName = "";
  @state() private confirmDelete = "";
  /** Vorlagen-Vorschau: nur im Panel, am Strip aendert sich nichts. */
  @state() private previewColors: string[] | null = null;
  @state() private tool: "brush" | "range" = "brush";
  private previewRequest = 0;

  private stopPreview: (() => Promise<void>) | null = null;
  private previewTimer?: number;
  private previewRunning: Promise<unknown> = Promise.resolve();
  private paintTimer?: number;
  private paintRunning: Promise<unknown> = Promise.resolve();
  private loaded = false;

  private get t() {
    return translator(this.hass?.language);
  }

  private get liveDelay(): number {
    return this.strip?.live_delay_ms ?? PREVIEW_DEBOUNCE_MS;
  }

  private get strip(): api.StripInfo | undefined {
    return this.strips.find((s) => s.entry_id === this.selectedId);
  }

  protected updated() {
    if (this.hass && !this.loaded) {
      this.loaded = true;
      void this.load();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    void this.endCalibration();
    void this.flushPaint();
  }

  private async run<T>(work: () => Promise<T>): Promise<T | undefined> {
    this.busy = true;
    this.message = "";
    try {
      return await work();
    } catch (err) {
      this.message = `${this.t("error")}: ${(err as { message?: string }).message ?? err}`;
      return undefined;
    } finally {
      this.busy = false;
    }
  }

  private async load(keepSelection = false) {
    const strips = await this.run(() => api.fetchStrips(this.hass));
    if (!strips) return;
    this.strips = strips;
    if (!keepSelection || !this.strip) this.select(strips[0]?.entry_id ?? "");
  }

  /** `pickMode`: ohne gespeichertes Layout mit dem Layout beginnen, sonst mit den Farben. */
  private select(entryId: string, pickMode = true) {
    void this.endCalibration();
    this.selectedId = entryId;
    if (pickMode) this.mode = this.strip && !this.strip.layout_saved ? "layout" : "paint";
    this.draft = this.strip ? structuredClone(this.strip.layout) : null;
    this.dirty = false;
    this.selectedCorner = -1;
    this.paintColors = this.strip?.colors ? [...this.strip.colors] : null;
    this.confirmDelete = "";
    this.previewColors = null;
    if (this.mode === "paint") void this.ensureColors();
  }

  private async setMode(mode: Mode) {
    if (mode === this.mode) return;
    if (mode === "paint") await this.endCalibration();
    else await this.flushPaint();
    this.previewColors = null;
    this.mode = mode;
    if (mode === "paint") await this.ensureColors();
  }

  /** Malen braucht den echten Farbstand -- notfalls vom Strip lesen. */
  private async ensureColors() {
    if (!this.strip?.colors) await this.readColors();
    else if (!this.paintColors) this.paintColors = [...this.strip.colors];
  }

  private replaceStrip(info: api.StripInfo) {
    this.strips = this.strips.map((s) => (s.entry_id === info.entry_id ? info : s));
    if (info.entry_id === this.selectedId && info.colors) this.paintColors = [...info.colors];
  }

  private setTool(tool: "brush" | "range") {
    this.tool = tool;
    this.renderRoot.querySelector("sbs-strip-view")?.clearRange();
  }

  /** Stand vor dem laufenden Pinselstrich -- fuer paint-cancel (Zoom-Geste). */
  private strokeBase: string[] | null = null;

  private cancelStroke() {
    if (this.strokeBase) this.setPaintColors(this.strokeBase);
    this.strokeBase = null;
  }

  private paint(index: number) {
    if (!this.paintColors || this.paintColors[index] === this.brush) return;
    this.strokeBase ??= [...this.paintColors];
    const colors = [...this.paintColors];
    colors[index] = this.brush;
    this.setPaintColors(colors);
  }

  private paintRange({ from, to }: RangeDetail) {
    if (!this.paintColors) return;
    this.setPaintColors(this.paintColors.map((c, i) => (i >= from && i <= to ? this.brush : c)));
  }

  private setPaintColors(colors: string[]) {
    this.paintColors = colors;
    window.clearTimeout(this.paintTimer);
    this.paintTimer = window.setTimeout(() => this.sendPaint(), this.liveDelay);
  }

  private sendPaint() {
    window.clearTimeout(this.paintTimer);
    // Nacheinander senden; jeweils den neuesten Stand.
    this.paintRunning = this.paintRunning.then(async () => {
      const colors = this.paintColors;
      const strip = this.strip;
      if (!colors || !strip || colors.join() === strip.colors?.join()) return;
      const ok = await this.run(() => api.applyColors(this.hass, strip.entry_id, colors));
      if (ok) {
        this.strips = this.strips.map((s) =>
          s.entry_id === strip.entry_id ? { ...s, colors, active_preset: this.matchPreset(s, colors) } : s,
        );
      }
    });
    return this.paintRunning;
  }

  private async flushPaint() {
    if (this.paintTimer !== undefined) await this.sendPaint();
    else await this.paintRunning;
    this.paintTimer = undefined;
  }

  /** Vorlage vom Backend berechnen lassen (mit dem Layout-Entwurf) und live uebernehmen. */
  private async applyTemplate(request: TemplateRequest) {
    if (!this.draft) return;
    const result = await this.run(() => api.renderTemplate(this.hass, this.selectedId, request, this.draft!));
    if (result) {
      this.previewColors = null;
      this.setPaintColors(result.colors);
      await this.sendPaint();
    }
  }

  /** Vorlage nur berechnen und im Panel zeigen; spaete Antworten ueberholter Anfragen verwerfen. */
  private async previewTemplate(request: TemplateRequest) {
    if (!this.draft) return;
    const ticket = ++this.previewRequest;
    const result = await api
      .renderTemplate(this.hass, this.selectedId, request, this.draft)
      .catch((err: { message?: string }) => {
        this.message = `${this.t("error")}: ${err.message ?? err}`;
        return undefined;
      });
    if (result && ticket === this.previewRequest) this.previewColors = result.colors;
  }

  private applyPreview() {
    if (!this.previewColors) return;
    this.setPaintColors(this.previewColors);
    this.previewColors = null;
    void this.sendPaint();
  }

  private matchPreset(strip: api.StripInfo, colors: string[]): string | null {
    const key = colors.join();
    return Object.keys(strip.presets).sort().find((name) => strip.presets[name].join() === key) ?? null;
  }

  private async presetAction(action: "save" | "apply" | "delete", name: string) {
    await this.flushPaint();
    const call = { save: api.savePreset, apply: api.applyPreset, delete: api.deletePreset }[action];
    const info = await this.run(() => call(this.hass, this.selectedId, name));
    if (!info) return;
    this.replaceStrip(info);
    this.confirmDelete = "";
    if (action === "save") this.presetName = "";
  }

  private change(layout: Layout) {
    this.draft = layout;
    this.dirty = true;
    if (this.calibrating) this.schedulePreview();
  }

  private schedulePreview() {
    window.clearTimeout(this.previewTimer);
    this.previewTimer = window.setTimeout(() => {
      // Nacheinander senden; jeweils den neuesten Stand.
      this.previewRunning = this.previewRunning.then(() =>
        this.calibrating && this.draft
          ? this.run(() => api.updatePreview(this.hass, this.selectedId, this.draft!))
          : undefined,
      );
    }, this.liveDelay);
  }

  private async toggleCalibration() {
    if (this.calibrating) return this.endCalibration();
    const stop = await this.run(() => api.startPreview(this.hass, this.selectedId));
    if (!stop) return;
    this.stopPreview = stop;
    this.calibrating = true;
    this.schedulePreview();
  }

  private async endCalibration() {
    window.clearTimeout(this.previewTimer);
    this.calibrating = false;
    const stop = this.stopPreview;
    this.stopPreview = null;
    if (stop) {
      await this.previewRunning;
      await stop().catch(() => undefined);
    }
  }

  private moveCorner(corner: number, index: number) {
    if (!this.draft) return;
    const [min, max] = cornerRange(this.draft, corner);
    const clamped = Math.min(max, Math.max(min, index));
    const corners = this.draft.corners.map((c, i) => (i === corner ? { ...c, index: clamped } : c));
    this.selectedCorner = corner;
    this.change({ ...this.draft, corners });
  }

  private async save() {
    if (!this.draft) return;
    const ok = await this.run(() => api.saveLayout(this.hass, this.selectedId, this.draft!));
    if (ok === undefined) return;
    this.dirty = false;
    this.message = this.t("saved");
    await this.load(true);
    this.draft = this.strip ? structuredClone(this.strip.layout) : this.draft;
  }

  private async readColors() {
    const info = await this.run(() => api.readColors(this.hass, this.selectedId));
    if (info) this.replaceStrip(info);
  }

  static styles = css`
    :host { display: block; background: var(--primary-background-color); color: var(--primary-text-color); min-height: 100vh; }
    .toolbar { display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 12px; background: var(--app-header-background-color, var(--primary-color)); color: var(--app-header-text-color, #fff); font-size: 20px; }
    .content { padding: 16px; max-width: 1100px; margin: 0 auto; display: grid; gap: 16px; }
    .card { background: var(--card-background-color, #fff); border-radius: var(--ha-card-border-radius, 12px); box-shadow: var(--ha-card-box-shadow, 0 1px 3px #0002); padding: 16px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    h2 { font-size: 16px; margin: 0 0 8px; font-weight: 500; }
    button { font: inherit; border: 1px solid var(--divider-color, #ccc); background: var(--card-background-color, #fff); color: inherit; border-radius: 8px; padding: 6px 12px; min-height: 36px; cursor: pointer; touch-action: manipulation; }
    .segmented { display: inline-flex; }
    .segmented button { border-radius: 0; }
    .segmented button:first-child { border-radius: 8px 0 0 8px; }
    .segmented button:last-child { border-radius: 0 8px 8px 0; }
    button.primary, button.on { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
    button:disabled { opacity: 0.5; cursor: default; }
    .corner { display: grid; grid-template-columns: 70px auto auto auto; align-items: center; gap: 8px; padding: 4px; border-radius: 8px; }
    .corner.selected { background: var(--secondary-background-color, #0001); }
    .tabs { display: flex; gap: 4px; margin-bottom: 12px; }
    .tabs button { flex: 1; }
    .swatches { display: flex; flex-wrap: wrap; gap: 6px; }
    .swatch { width: 32px; height: 32px; min-height: 0; padding: 0; border-radius: 50%; }
    .swatch.on { outline: 3px solid var(--primary-color); outline-offset: 2px; }
    .swatch.current { display: inline-block; width: 36px; height: 36px; border: 1px solid var(--divider-color, #ccc); box-sizing: border-box; }
    input[type="text"] { font: inherit; flex: 1; min-width: 0; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--divider-color, #ccc); background: var(--card-background-color, #fff); color: inherit; }
    .preset { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 8px; padding: 6px 4px; }
    .preset .bar { height: 10px; border-radius: 5px; margin-top: 4px; }
    .preset.active .name { font-weight: 600; }
    .group { border: 1px solid var(--divider-color, #0002); border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; display: grid; gap: 8px; }
    .group:last-child { margin-bottom: 0; }
    .group h2 { margin: 0; }
    .group .hint { margin: 0; }
    h3 { font-size: 14px; font-weight: 500; margin: 4px 0 0; color: var(--secondary-text-color); }
    .actions { margin-top: 4px; }
    .banner { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 8px; border-radius: 10px; border: 1px dashed var(--primary-color); color: var(--primary-text-color); }
    .banner span { flex: 1; font-size: 14px; }
    sbs-strip-view.previewing { outline: 1px dashed var(--primary-color); outline-offset: 4px; border-radius: 8px; }
    .hint, .status { color: var(--secondary-text-color); font-size: 14px; }
    @media (min-width: 900px) { .content { grid-template-columns: 2fr 1fr; } }
    /* Finger: groessere Tippflaechen (mind. 44 px), mehr Abstand. */
    @media (pointer: coarse) {
      button { min-height: 44px; padding: 8px 14px; }
      .row { gap: 10px; }
      .swatches { gap: 10px; }
      .swatch { width: 44px; height: 44px; }
      .corner { grid-template-columns: 1fr auto; row-gap: 6px; }
      .corner .row button { min-width: 44px; }
      input[type="text"] { min-height: 44px; font-size: 16px; }
      .preset { padding: 8px 4px; }
      .preset .bar { height: 14px; }
    }
    button.icon { font-size: 18px; min-width: 44px; padding: 6px 10px; }
    .hint.small { font-size: 13px; margin: 6px 0 0; }
    /* Schmal: kompakte Strip-Karte, die beim Scrollen oben stehen bleibt. */
    @media (max-width: 899px) {
      .content { padding: 8px; gap: 8px; }
      .card { padding: 12px; }
      .content > .card:first-child { position: sticky; top: 0; z-index: 2; padding: 8px 12px 10px; }
      .content > .card:first-child .title { font-size: 14px; margin: 0 0 4px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .content > .card:first-child .row { flex-wrap: nowrap; }
      .content > .card:first-child .status { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      sbs-strip-view { --sbs-strip-max-height: 30vh; }
      .group { padding: 10px 12px; }
    }
  `;

  private renderCorners(draft: Layout) {
    return html`${draft.corners.map(
      (c, i) => html`<div class="corner ${i === this.selectedCorner ? "selected" : ""}" @click=${() => (this.selectedCorner = i)}>
        <span>${this.t("corner")} ${i + 1}</span>
        <span class="row">
          <button @click=${() => this.moveCorner(i, c.index - 1)}>−</button>
          <span>${this.t("segment")} ${c.index + 1}</span>
          <button @click=${() => this.moveCorner(i, c.index + 1)}>+</button>
        </span>
        <button @click=${() => this.change({ ...draft, corners: draft.corners.map((x, j) => (j === i ? { ...x, turn: x.turn === "left" ? "right" : "left" } : x)) })}>
          ${c.turn === "left" ? `↰ ${this.t("left")}` : `↱ ${this.t("right")}`}
        </button>
        <button title=${this.t("remove")} @click=${() => { this.selectedCorner = -1; this.change({ ...draft, corners: draft.corners.filter((_, j) => j !== i) }); }}>✕</button>
      </div>`,
    )}`;
  }

  render() {
    const strip = this.strip;
    const draft = this.draft;
    return html`
      <div class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <span>${this.t("title")}</span>
      </div>
      <div class="content">
        ${!strip || !draft
          ? html`<div class="card">${this.busy ? "…" : this.t("noStrips")}</div>`
          : html`
              <div class="card">
                ${this.strips.length > 1
                  ? html`<div class="row" style="margin-bottom:8px">${this.strips.map(
                      (s) => html`<button class=${s.entry_id === this.selectedId ? "on" : ""} @click=${() => this.select(s.entry_id)}>${s.title}</button>`,
                    )}</div>`
                  : html`<h2 class="title">${strip.title}</h2>`}
                ${this.previewColors
                  ? html`<div class="banner">
                      <span>${this.t("previewBanner")}</span>
                      <button class="primary" ?disabled=${this.busy} @click=${this.applyPreview}>${this.t("applyToStrip")}</button>
                      <button @click=${() => (this.previewColors = null)}>${this.t("endPreview")}</button>
                    </div>`
                  : nothing}
                <sbs-strip-view
                  class=${this.previewColors ? "previewing" : ""}
                  .layout=${draft}
                  .colors=${this.previewColors ?? (this.mode === "paint" ? this.paintColors : this.calibrating ? calibrationColors(draft) : strip.colors)}
                  .selected=${this.selectedCorner}
                  .mode=${this.previewColors ? "view" : this.mode}
                  .tool=${this.tool}
                  @segment-range=${(e: CustomEvent<RangeDetail>) => this.paintRange(e.detail)}
                  @paint-end=${() => (this.strokeBase = null)}
                  @paint-cancel=${this.cancelStroke}
                  @segment-paint=${(e: CustomEvent<number>) => this.paint(e.detail)}
                  @corner-select=${(e: CustomEvent<number>) => (this.selectedCorner = e.detail)}
                  @corner-move=${(e: CustomEvent<CornerMoveDetail>) => this.moveCorner(e.detail.corner, e.detail.index)}
                ></sbs-strip-view>
                <div class="row">
                  ${this.mode === "paint" && !this.previewColors
                    ? html`<div class="segmented">
                        <button class=${this.tool === "brush" ? "on" : ""} @click=${() => this.setTool("brush")}>✎\uFE0E ${this.t("toolBrush")}</button>
                        <button class=${this.tool === "range" ? "on" : ""} @click=${() => this.setTool("range")}>↔\uFE0E ${this.t("toolRange")}</button>
                      </div>`
                    : nothing}
                  <button class="icon" title=${this.t("read")} aria-label=${this.t("read")} @click=${this.readColors} ?disabled=${this.busy || this.calibrating}>⟳\uFE0E</button>
                  <span class="status">${this.message || (this.dirty ? this.t("unsaved") : nothing)}</span>
                </div>
                ${this.mode === "paint" && this.tool === "range" && !this.previewColors
                  ? html`<p class="hint small">${this.t("rangeHint")}</p>`
                  : nothing}
              </div>
              <div class="card">
                <div class="tabs">
                  <button class=${this.mode === "paint" ? "on" : ""} @click=${() => this.setMode("paint")}>${this.t("paintTab")}</button>
                  <button class=${this.mode === "layout" ? "on" : ""} @click=${() => this.setMode("layout")}>${this.t("layoutTab")}</button>
                </div>
                ${this.mode === "paint" ? this.renderPaint(strip) : this.renderLayout(draft)}
              </div>
            `}
      </div>
    `;
  }

  private renderPaint(strip: api.StripInfo) {
    const swatches = [...new Set(this.paintColors ?? [])].slice(0, MAX_SWATCHES);
    const names = Object.keys(strip.presets).sort();
    return html`
      <section class="group">
        <h2>${this.t("brush")}</h2>
        <p class="hint">${this.t("brushHint")}</p>
        <sbs-light-picker
          .value=${this.brush}
          .whitesLabel=${this.t("whites")}
          @color-change=${(e: CustomEvent<string>) => (this.brush = e.detail)}
        ></sbs-light-picker>
        <div class="row">
          <span class="swatch current" style="background:#${this.brush}"></span>
          <button ?disabled=${!this.paintColors} @click=${() => this.setPaintColors(this.paintColors!.map(() => this.brush))}>${this.t("fillAll")}</button>
        </div>
        ${swatches.length
          ? html`<h3>${this.t("onStrip")}</h3>
              <div class="swatches">
                ${swatches.map(
                  (c) => html`<button class="swatch ${c === this.brush ? "on" : ""}" style="background:#${c}" title="#${c}" @click=${() => (this.brush = c)}></button>`,
                )}
              </div>`
          : nothing}
      </section>
      <section class="group">
        <h2>${this.t("presets")}</h2>
        ${names.length ? nothing : html`<p class="hint">${this.t("noPresets")}</p>`}
        ${names.map((name) => {
          const colors = strip.presets[name];
          const stops = colors.map((c, i) => `#${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(", ");
          return html`<div class="preset ${strip.active_preset === name ? "active" : ""}">
            <div>
              <div class="name">${name}${strip.active_preset === name ? html` <span class="status">· ${this.t("active")}</span>` : nothing}</div>
              <div class="bar" style="background:linear-gradient(to right, ${stops})"></div>
            </div>
            <button ?disabled=${this.busy} @click=${() => this.presetAction("apply", name)}>${this.t("apply")}</button>
            ${this.confirmDelete === name
              ? html`<button class="primary" @click=${() => this.presetAction("delete", name)}>${this.t("confirmDelete")}</button>`
              : html`<button title=${this.t("remove")} @click=${() => (this.confirmDelete = name)}>✕</button>`}
          </div>`;
        })}
        <div class="row">
          <input type="text" placeholder=${this.t("presetName")} .value=${this.presetName}
            @input=${(e: Event) => (this.presetName = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this.presetName.trim() && this.presetAction("save", this.presetName.trim())} />
          <button class="primary" ?disabled=${!this.presetName.trim() || this.busy} @click=${() => this.presetAction("save", this.presetName.trim())}>
            ${this.t("savePreset")}
          </button>
        </div>
      </section>
      <section class="group">
        <h2>${this.t("templates")}</h2>
        <sbs-template-picker
          .t=${this.t}
          .brush=${this.brush}
          .maxSteps=${strip.segment_count}
          .previewing=${this.previewColors !== null}
          @template-preview=${(e: CustomEvent<TemplateRequest>) => this.previewTemplate(e.detail)}
          ?disabled=${!this.paintColors || this.busy}
          @template-apply=${(e: CustomEvent<TemplateRequest>) => this.applyTemplate(e.detail)}
        ></sbs-template-picker>
      </section>
    `;
  }

  private renderLayout(draft: Layout) {
    return html`
      <section class="group">
        <h2>${this.t("start")}</h2>
        <div class="row">
          ${DIRECTIONS.map(
            ([dir, arrow]) => html`<button class=${draft.start_direction === dir ? "on" : ""} @click=${() => this.change({ ...draft, start_direction: dir })}>${arrow}</button>`,
          )}
        </div>
      </section>
      <section class="group">
        <h2>${this.t("corners")}</h2>
        ${this.renderCorners(draft)}
        <div class="row">
          <button @click=${() => { const next = addCorner(draft); if (next) this.change(next); }}>+ ${this.t("addCorner")}</button>
        </div>
      </section>
      <section class="group">
        <h2>${this.t("calibrate")}</h2>
        <p class="hint">${this.t("calibrateHint")}</p>
        <div class="row">
          <button class=${this.calibrating ? "on" : ""} @click=${this.toggleCalibration} ?disabled=${this.busy && !this.calibrating}>
            ${this.calibrating ? this.t("calibrating") : this.t("calibrate")}
          </button>
        </div>
      </section>
      <div class="row actions">
        <button class="primary" @click=${this.save} ?disabled=${!this.dirty || this.busy}>${this.t("save")}</button>
        <button @click=${() => this.select(this.selectedId, false)} ?disabled=${!this.dirty}>${this.t("discard")}</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "switchbot-segments-panel": SwitchbotSegmentsPanel;
  }
}
