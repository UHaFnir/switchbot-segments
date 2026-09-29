// Zoom/Verschieben der Strip-Ansicht ueber die viewBox. Das Seitenverhaeltnis bleibt das
// der Gesamtansicht (`base`), damit das SVG-Element seine Groesse behaelt.
// preserveAspectRatio ist der Standard "xMidYMid meet".
import type { Box } from "./geometry";

export const MAX_ZOOM = 8;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Fit {
  scale: number; // Pixel pro SVG-Einheit
  offX: number;
  offY: number;
}

function fit(view: Box, rect: Rect): Fit {
  const scale = Math.min(rect.width / view.width, rect.height / view.height);
  return {
    scale,
    offX: (rect.width - view.width * scale) / 2,
    offY: (rect.height - view.height * scale) / 2,
  };
}

/** Bildschirmpunkt -> SVG-Koordinaten bei gegebener viewBox. */
export function clientToSvg(view: Box, rect: Rect, clientX: number, clientY: number) {
  const f = fit(view, rect);
  return {
    x: view.x + (clientX - rect.left - f.offX) / f.scale,
    y: view.y + (clientY - rect.top - f.offY) / f.scale,
  };
}

/**
 * viewBox mit Zoomstufe `zoom` (1 = Gesamtansicht), bei der der SVG-Punkt `p` unter dem
 * Bildschirmpunkt (clientX, clientY) liegt. Begrenzt auf 1..MAX_ZOOM und so, dass der
 * Ausschnitt nicht aus der Gesamtansicht herauslaeuft.
 */
export function placeView(base: Box, rect: Rect, zoom: number, p: { x: number; y: number }, clientX: number, clientY: number): Box {
  const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const width = base.width / z;
  const height = base.height / z;
  const f = fit({ x: 0, y: 0, width, height }, rect);
  let x = p.x - (clientX - rect.left - f.offX) / f.scale;
  let y = p.y - (clientY - rect.top - f.offY) / f.scale;
  x = Math.min(base.x + base.width - width, Math.max(base.x, x));
  y = Math.min(base.y + base.height - height, Math.max(base.y, y));
  return { x, y, width, height };
}

export const zoomOf = (base: Box, view: Box) => base.width / view.width;

/** Um `factor` zoomen, Punkt unter (clientX, clientY) bleibt stehen. */
export function zoomAt(base: Box, view: Box, rect: Rect, factor: number, clientX: number, clientY: number): Box {
  const p = clientToSvg(view, rect, clientX, clientY);
  return placeView(base, rect, zoomOf(base, view) * factor, p, clientX, clientY);
}
