// Run: npx tsx scripts/check.ts
import assert from "node:assert";
import { brailleToGcode, GcodeSettings } from "../src/utils/gcode";

const s: GcodeSettings = {
  dotSpacing: 2.5, dotDepth: 0.5, startX: 10, startY: 10, feedRate: 1200, drillRate: 300, safeZ: 5,
};
const g = brailleToGcode("⠁⠿", s);
assert.ok(g.includes("G92 Z5"));
assert.equal(g.match(/^G1 Z4\.50 F300$/gm)?.length, 7); // 1 + 6 dots
assert.ok(g.includes("G1 X10.00 Y10.00 F1200\nG1 Z4.50 F300\nG1 Z5 F300"));
assert.ok(!/G28|Z-|M8|M2\b/.test(g)); // Marlin: never ask for Z below 0
// negative depth punches toward +Z
assert.ok(brailleToGcode("⠁", { ...s, dotDepth: -0.5 }).includes("G1 Z5.50 F300"));
console.log("ok");
