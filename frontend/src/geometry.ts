// Strip-Geometrie: aus Segmentanzahl, Startrichtung und Ecken die Lage jedes Segments.
// Gegenstueck zu custom_components/switchbot_segments/layout.py (Validierung, Abschnitte).
//
// Jedes Segment ist eine Einheitsstrecke. Ein Ecksegment ist das letzte seines Abschnitts;
// danach knickt der Strip um 90 Grad. Bildschirmkoordinaten: x nach rechts, y nach unten.

export type Direction = "right" | "down" | "left" | "up";
export type Turn = "left" | "right";

export interface Corner {
  index: number;
  turn: Turn;
}

export interface Layout {
  segment_count: number;
  start_direction: Direction;
  corners: Corner[];
}

export interface SegmentPos {
  index: number;
  x: number; // Mittelpunkt
  y: number;
  angle: number; // Grad, 0 = nach rechts
  section: number;
}

const VECTORS: Record<Direction, [number, number]> = {
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
  up: [0, -1],
};

const noNegZero = (n: number): number => (n === 0 ? 0 : n);

export function turnVector([x, y]: [number, number], turn: Turn): [number, number] {
  // y zeigt nach unten: rechts drehen = im Uhrzeigersinn
  const [nx, ny] = turn === "right" ? [-y, x] : [y, -x];
  return [noNegZero(nx), noNegZero(ny)];
}

export function computeSegments(layout: Layout): SegmentPos[] {
  const corners = new Map(layout.corners.map((c) => [c.index, c.turn]));
  let [dx, dy] = VECTORS[layout.start_direction];
  let x = 0;
  let y = 0;
  let section = 0;
  const out: SegmentPos[] = [];
  for (let index = 0; index < layout.segment_count; index++) {
    out.push({
      index,
      x: x + dx / 2,
      y: y + dy / 2,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      section,
    });
    x += dx;
    y += dy;
    const turn = corners.get(index);
    if (turn) {
      [dx, dy] = turnVector([dx, dy], turn);
      section++;
    }
  }
  return out;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function boundingBox(segments: SegmentPos[], padding = 1.5): Box {
  const xs = segments.map((s) => s.x);
  const ys = segments.map((s) => s.y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) + padding - minX,
    height: Math.max(...ys) + padding - minY,
  };
}

/** Naechstes Segment zu (x, y), beschraenkt auf [min, max]. */
export function nearestSegment(
  segments: SegmentPos[],
  x: number,
  y: number,
  min = 0,
  max = segments.length - 1,
): number {
  let best = min;
  let bestDist = Infinity;
  for (const s of segments.slice(min, max + 1)) {
    const d = (s.x - x) ** 2 + (s.y - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = s.index;
    }
  }
  return best;
}

/** Erlaubter Bereich fuer Ecke `i`: zwischen den Nachbarecken bzw. innerhalb des Strips. */
export function cornerRange(layout: Layout, i: number): [number, number] {
  const prev = i > 0 ? layout.corners[i - 1].index + 1 : 1;
  const next = i < layout.corners.length - 1 ? layout.corners[i + 1].index - 1 : layout.segment_count - 2;
  return [prev, next];
}

/** Neue Ecke in die Mitte des laengsten Abschnitts setzen; null, wenn kein Platz. */
export function addCorner(layout: Layout, turn: Turn = "right"): Layout | null {
  const bounds = [0, ...layout.corners.map((c) => c.index), layout.segment_count - 1];
  let bestStart = 0;
  let bestLen = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    const len = bounds[i + 1] - bounds[i];
    if (len > bestLen) {
      bestLen = len;
      bestStart = bounds[i];
    }
  }
  if (bestLen < 2) return null;
  const index = bestStart + Math.floor(bestLen / 2);
  const corners = [...layout.corners, { index, turn }].sort((a, b) => a.index - b.index);
  return { ...layout, corners };
}

export const CALIBRATION = { base: "ffc800", corner: "ff0000", start: "00ff00" };

/** Dieselben Kalibrierfarben wie layout.py -- fuer die Anzeige im Panel. */
export function calibrationColors(layout: Layout): string[] {
  const colors = Array<string>(layout.segment_count).fill(CALIBRATION.base);
  for (const c of layout.corners) colors[c.index] = CALIBRATION.corner;
  colors[0] = CALIBRATION.start;
  return colors;
}
