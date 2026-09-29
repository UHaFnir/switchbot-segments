import { describe, expect, it } from "vitest";
import {
  addCorner,
  boundingBox,
  calibrationColors,
  computeSegments,
  cornerRange,
  nearestSegment,
  turnVector,
  type Layout,
} from "../src/geometry";

// Umgekehrtes U: hoch, oben nach rechts, runter.
const U: Layout = {
  segment_count: 60,
  start_direction: "up",
  corners: [
    { index: 14, turn: "right" },
    { index: 45, turn: "right" },
  ],
};

describe("turnVector", () => {
  it("dreht rechts im Uhrzeigersinn (y nach unten)", () => {
    expect(turnVector([0, -1], "right")).toEqual([1, 0]); // hoch -> rechts
    expect(turnVector([1, 0], "right")).toEqual([0, 1]); // rechts -> runter
    expect(turnVector([0, -1], "left")).toEqual([-1, 0]); // hoch -> links
  });
});

describe("computeSegments", () => {
  const segs = computeSegments(U);

  it("legt das U korrekt", () => {
    expect(segs).toHaveLength(60);
    expect(segs[0]).toMatchObject({ x: 0, y: -0.5, angle: -90, section: 0 });
    expect(segs[14]).toMatchObject({ x: 0, y: -14.5, section: 0 });
    expect(segs[15]).toMatchObject({ x: 0.5, y: -15, angle: 0, section: 1 });
    expect(segs[46]).toMatchObject({ x: 31, y: -14.5, angle: 90, section: 2 });
    // Ecke 45 gehoert zum oberen Abschnitt: rechter Schenkel ist ein Segment kuerzer
    expect(segs[59].y).toBeCloseTo(-1.5);
    // symmetrisches U (15/30/15): Ende auf Hoehe des Anfangs
    const sym = computeSegments({ ...U, corners: [U.corners[0], { index: 44, turn: "right" }] });
    expect(sym[59].y).toBeCloseTo(-0.5);
  });

  it("Bounding Box umfasst alles", () => {
    const box = boundingBox(segs, 1);
    expect(box.x).toBe(-1);
    expect(box.width).toBe(33);
  });
});

describe("Ecken", () => {
  it("nearestSegment respektiert Grenzen", () => {
    const segs = computeSegments(U);
    expect(nearestSegment(segs, 0, -15)).toBe(14);
    expect(nearestSegment(segs, 0, -15, 20, 40)).toBe(20);
  });

  it("cornerRange haelt Abstand zu Nachbarn und Enden", () => {
    expect(cornerRange(U, 0)).toEqual([1, 44]);
    expect(cornerRange(U, 1)).toEqual([15, 58]);
  });

  it("addCorner teilt den laengsten Abschnitt", () => {
    expect(addCorner(U)?.corners.map((c) => c.index)).toEqual([14, 29, 45]);
    expect(addCorner({ segment_count: 3, start_direction: "right", corners: [{ index: 1, turn: "left" }] })).toBeNull();
  });

  it("Kalibrierfarben wie im Backend", () => {
    const colors = calibrationColors(U);
    expect(colors[0]).toBe("00ff00");
    expect(colors[14]).toBe("ff0000");
    expect(colors.filter((c) => c === "ffc800")).toHaveLength(57);
  });
});
