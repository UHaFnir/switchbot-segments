// Farbumrechnung fuer den Licht-Farbwaehler: Farbton/Saettigung (volle Helligkeit, wie
// HAs Licht-Dialog) und Farbtemperatur. Farben als Hex ohne "#".

const hex2 = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");

export const rgbToHex = (r: number, g: number, b: number) => hex2(r) + hex2(g) + hex2(b);

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Farbton 0..360, Saettigung 0..1, Helligkeit immer voll. */
export function hsToHex(hue: number, sat: number): string {
  const f = (n: number) => {
    const k = (n + hue / 60) % 6;
    return 255 * (1 - sat * Math.max(0, Math.min(k, 4 - k, 1)));
  };
  return rgbToHex(f(5), f(3), f(1));
}

/** Farbton und Saettigung einer Farbe (Helligkeit wird ignoriert). */
export function hexToHs(hex: string): { hue: number; sat: number } {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (max === 0 || d === 0) return { hue: 0, sat: 0 };
  let hue: number;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return { hue: (hue * 60 + 360) % 360, sat: d / max };
}

/** Farbtemperatur (Kelvin) als RGB-Naeherung (Tanner Helland), auf volle Helligkeit skaliert. */
export function kelvinToHex(kelvin: number): string {
  const t = kelvin / 100;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const [cr, cg, cb] = [r, g, b].map((c) => Math.min(255, Math.max(0, c)));
  const scale = 255 / Math.max(cr, cg, cb);
  return rgbToHex(cr * scale, cg * scale, cb * scale);
}
