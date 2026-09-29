// Vorlagen (intelligente Presets): Vorlage, Palette aus Pinselfarben, Stufen/Akzentbreite.
// Rechnet nichts selbst -- meldet die Wahl per Event template-apply, das Panel holt die
// Farben vom Backend (presets.py) und uebernimmt sie in die Malflaeche.
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Translate } from "./i18n";

export const TEMPLATES = ["sections", "gradient", "section_gradient", "mirror", "corner_accent"] as const;
export type Template = (typeof TEMPLATES)[number];

export interface TemplateRequest {
  template: Template;
  colors: string[];
  steps: number;
  accent_width: number;
}

const MAX_COLORS = 4;
const GRADIENTS: Template[] = ["gradient", "section_gradient", "mirror"];

@customElement("sbs-template-picker")
export class TemplatePicker extends LitElement {
  @property({ attribute: false }) t!: Translate;
  @property() brush = "ff0000";
  @property({ type: Boolean }) disabled = false;
  @property({ type: Number }) maxSteps = 60;
  /** Panel zeigt gerade eine Vorschau -- jede Aenderung schickt dann eine neue. */
  @property({ type: Boolean }) previewing = false;

  @state() private template: Template = "sections";
  @state() private palette: string[] = ["ff0000", "0000ff"];
  @state() private steps = 6;
  @state() private accentWidth = 1;

  static styles = css`
    :host { display: grid; gap: 8px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    button { font: inherit; border: 1px solid var(--divider-color, #ccc); background: var(--card-background-color, #fff); color: inherit; border-radius: 8px; padding: 6px 10px; min-height: 36px; cursor: pointer; touch-action: manipulation; }
    button.on, button.primary { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
    button:disabled { opacity: 0.5; cursor: default; }
    .chip { position: relative; width: 32px; height: 32px; padding: 0; border-radius: 50%; }
    .chip span { position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; border-radius: 50%; font-size: 11px; line-height: 16px; background: var(--card-background-color, #fff); color: var(--primary-text-color); border: 1px solid var(--divider-color, #ccc); }
    .row label { flex: 1; }
    label { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    input[type="range"] { flex: 1; min-height: 32px; accent-color: var(--primary-color); }
    @media (pointer: coarse) {
      button { min-height: 44px; padding: 8px 12px; }
      .chip { width: 44px; height: 44px; }
      .chip span { width: 22px; height: 22px; line-height: 22px; font-size: 13px; }
      input[type="range"] { min-height: 44px; }
    }
    .hint { color: var(--secondary-text-color); font-size: 14px; margin: 0; }
  `;

  private get request(): TemplateRequest {
    return { template: this.template, colors: this.palette, steps: this.steps, accent_width: this.accentWidth };
  }

  private get valid(): boolean {
    return this.palette.length >= (this.template === "corner_accent" ? 2 : 1);
  }

  private emit(name: "template-apply" | "template-preview") {
    this.dispatchEvent(new CustomEvent<TemplateRequest>(name, { detail: this.request }));
  }

  protected updated(changed: Map<string, unknown>) {
    const settings = ["template", "palette", "steps", "accentWidth"].some((k) => changed.has(k));
    if (settings && this.previewing && this.valid) this.emit("template-preview");
  }

  render() {
    const t = this.t;
    return html`
      <div class="row">
        ${TEMPLATES.map(
          (tpl) => html`<button class=${tpl === this.template ? "on" : ""} @click=${() => (this.template = tpl)}>${t(`tpl_${tpl}`)}</button>`,
        )}
      </div>
      <p class="hint">${t(`tplHint_${this.template}`)}</p>
      <div class="row">
        ${this.palette.map(
          (c, i) => html`<button class="chip" style="background:#${c}" title=${t("remove")}
            @click=${() => (this.palette = this.palette.filter((_, j) => j !== i))}><span>✕</span></button>`,
        )}
        <button ?disabled=${this.palette.length >= MAX_COLORS} @click=${() => (this.palette = [...this.palette, this.brush])}>
          + ${t("addBrush")}
        </button>
      </div>
      ${GRADIENTS.includes(this.template)
        ? html`<div class="row"><label>${t("steps")}
            <input type="range" min="2" max=${this.maxSteps} .value=${String(Math.min(this.steps, this.maxSteps))} @input=${(e: Event) => (this.steps = Number((e.target as HTMLInputElement).value))} />
            ${this.steps}</label></div>
            <p class="hint">${t("stepsHint")}</p>`
        : nothing}
      ${this.template === "corner_accent"
        ? html`<div class="row"><label>${t("accentWidth")}
            <input type="range" min="0" max="8" .value=${String(this.accentWidth)} @input=${(e: Event) => (this.accentWidth = Number((e.target as HTMLInputElement).value))} />
            ±${this.accentWidth}</label></div>`
        : nothing}
      <div class="row">
        <button class=${this.previewing ? "on" : ""} ?disabled=${!this.valid} @click=${() => this.emit("template-preview")}>
          ${t("previewTemplate")}
        </button>
        <button class="primary" ?disabled=${this.disabled || !this.valid} @click=${() => this.emit("template-apply")}>
          ${t("applyTemplate")}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sbs-template-picker": TemplatePicker;
  }
}
