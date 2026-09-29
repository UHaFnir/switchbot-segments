// Farbwaehler fuer Licht: Farbrad (Farbton rundherum, Saettigung zur Mitte hin weiss) und
// Weisstoene nach Farbtemperatur. Meldet die Farbe als Hex ohne "#" (Event color-change).
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { hexToHs, hsToHex, kelvinToHex } from "./color";

const WHITES = [2200, 2700, 3000, 4000, 5000, 6500];

@customElement("sbs-light-picker")
export class LightPicker extends LitElement {
  @property() value = "ff0000";
  @property({ attribute: false }) whitesLabel = "";

  private dragging = false;

  static styles = css`
    :host { display: block; }
    .wheel {
      position: relative; width: min(100%, 240px); aspect-ratio: 1; margin: 0 auto; border-radius: 50%;
      background: radial-gradient(closest-side, #fff, #fff0),
        conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
      touch-action: none; cursor: crosshair;
    }
    .marker {
      position: absolute; width: 22px; height: 22px; margin: -13px 0 0 -13px; border-radius: 50%;
      border: 2px solid #fff; box-shadow: 0 0 0 1px #0006, 0 1px 4px #0006; pointer-events: none;
    }
    h3 { font-size: 14px; font-weight: 500; margin: 12px 0 6px; color: var(--secondary-text-color); }
    .whites { display: flex; flex-wrap: wrap; gap: 6px; }
    .whites button {
      font: inherit; font-size: 12px; min-width: 52px; padding: 6px 4px; border-radius: 8px; cursor: pointer;
      border: 1px solid var(--divider-color, #ccc); color: #000;
    }
    @media (pointer: coarse) {
      .wheel { width: min(100%, 280px); }
      .marker { width: 30px; height: 30px; margin: -17px 0 0 -17px; }
      .whites { gap: 10px; }
      .whites button { min-height: 44px; min-width: 60px; }
    }
    .whites button.on { outline: 3px solid var(--primary-color); outline-offset: 1px; }
  `;

  private pick(ev: PointerEvent) {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = ev.clientX - (rect.left + rect.width / 2);
    const dy = ev.clientY - (rect.top + rect.height / 2);
    // conic-gradient beginnt oben und laeuft im Uhrzeigersinn.
    const hue = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const sat = Math.min(1, Math.hypot(dx, dy) / (rect.width / 2));
    this.emit(hsToHex(hue, sat));
  }

  private emit(hex: string) {
    if (hex === this.value) return;
    this.dispatchEvent(new CustomEvent("color-change", { detail: hex }));
  }

  private onDown(ev: PointerEvent) {
    this.dragging = true;
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    this.pick(ev);
  }

  render() {
    const { hue, sat } = hexToHs(this.value);
    const rad = (hue * Math.PI) / 180;
    const x = 50 + 50 * sat * Math.sin(rad);
    const y = 50 - 50 * sat * Math.cos(rad);
    return html`
      <div
        class="wheel"
        @pointerdown=${this.onDown}
        @pointermove=${(ev: PointerEvent) => this.dragging && this.pick(ev)}
        @pointerup=${() => (this.dragging = false)}
        @pointercancel=${() => (this.dragging = false)}
      >
        <div class="marker" style="left:${x}%;top:${y}%;background:#${this.value}"></div>
      </div>
      <h3>${this.whitesLabel}</h3>
      <div class="whites">
        ${WHITES.map((k) => {
          const hex = kelvinToHex(k);
          return html`<button class=${hex === this.value ? "on" : ""} style="background:#${hex}" @click=${() => this.emit(hex)}>
            ${k} K
          </button>`;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sbs-light-picker": LightPicker;
  }
}
