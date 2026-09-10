import assert from "node:assert/strict";
import { test, expect } from "@playwright/test";
import { layoutPieces } from "../src/lib/nesting";

test("illustrative area math is exact for the default scenario", () => {
  const result = layoutPieces(320, 160, 140, 60, 4);
  expect(result.pieces).toHaveLength(4);
  expect(result.usedArea).toBeCloseTo(3.36);
  expect(result.remainingArea).toBeCloseTo(1.76);
  expect(result.utilization).toBeCloseTo(65.625);
  expect(result.unplaced).toBe(0);
});

test("all slider combinations stay in bounds, do not overlap and conserve area", () => {
  for (let width = 60; width <= 260; width += 10) {
    for (let height = 30; height <= 100; height += 5) {
      for (let count = 1; count <= 8; count++) {
        const result = layoutPieces(320, 160, width, height, count);
        assert.equal(result.pieces.length + result.unplaced, count);
        assert.ok(
          Math.abs(result.usedArea + result.remainingArea - 5.12) < 1e-10,
        );
        assert.ok(result.utilization <= 100);
        for (const [i, piece] of result.pieces.entries()) {
          assert.ok(piece.x + piece.width <= 320);
          assert.ok(piece.y + piece.height <= 160);
          assert.ok(piece.x >= 0);
          assert.ok(piece.y >= 0);
          for (const other of result.pieces.slice(i + 1)) {
            assert.ok(
              piece.x >= other.x + other.width ||
                other.x >= piece.x + piece.width ||
                piece.y >= other.y + other.height ||
                other.y >= piece.y + piece.height,
            );
          }
        }
      }
    }
  }
});

test("empty, oversized and invalid inputs", () => {
  expect(layoutPieces(320, 160, 500, 200, 4).unplaced).toBe(4);
  expect(layoutPieces(320, 160, 140, 60, 0).utilization).toBe(0);
  expect(() => layoutPieces(0, 160, 140, 60, 4)).toThrow();
  expect(() => layoutPieces(320, 160, NaN, 60, 4)).toThrow();
  expect(() => layoutPieces(320, 160, 140, 60, 101)).toThrow();
});
