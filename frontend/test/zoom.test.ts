import { describe, expect, it } from "vitest";
import { MAX_ZOOM, clientToSvg, placeView, zoomAt, zoomOf } from "../src/zoom";

const base = { x: 0, y: 0, width: 20, height: 10 };
// Element doppelt so hoch wie noetig -> vertikal zentriert (meet), 10 px pro Einheit.
const rect = { left: 100, top: 50, width: 200, height: 200 };

describe("zoom", () => {
  it("maps client to svg with letterboxing", () => {
    // Inhalt 200x100 px, vertikal um 50 px versetzt
    expect(clientToSvg(base, rect, 100, 100)).toEqual({ x: 0, y: 0 });
    expect(clientToSvg(base, rect, 300, 200)).toEqual({ x: 20, y: 10 });
  });

  it("keeps the point under the finger while zooming", () => {
    const view = zoomAt(base, base, rect, 2, 200, 150); // Mitte
    expect(zoomOf(base, view)).toBe(2);
    expect(clientToSvg(view, rect, 200, 150)).toEqual({ x: 10, y: 5 });
  });

  it("clamps zoom and panning to the full view", () => {
    expect(zoomOf(base, placeView(base, rect, 100, { x: 10, y: 5 }, 200, 150))).toBe(MAX_ZOOM);
    expect(placeView(base, rect, 0.5, { x: 10, y: 5 }, 200, 150)).toEqual(base);
    // Weit nach links geschoben: bleibt am Rand der Gesamtansicht
    const view = placeView(base, rect, 2, { x: -50, y: 5 }, 200, 150);
    expect(view.x).toBe(0);
  });
});
