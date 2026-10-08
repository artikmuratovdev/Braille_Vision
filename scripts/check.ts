// Run: npx tsx scripts/check.ts
import assert from "node:assert";
import { brailleToGcode, DEFAULT_SETTINGS, GcodeSettings } from "../src/utils/gcode";

const s: GcodeSettings = {
  ...DEFAULT_SETTINGS,
  dotSpacing: 2.5, dotDepth: 0.5, startX: 10, startY: 10, feedRate: 1200, drillRate: 300, safeZ: 5,
};
const g = brailleToGcode("⠁⠿", s);
assert.ok(g.includes("G92 Z5"));
assert.equal(g.match(/^G1 Z4\.50 F300$/gm)?.length, 7); // 1 + 6 dots
assert.ok(g.includes("G1 X10.00 Y10.00 F1200\nG1 Z4.50 F300\nG1 Z5 F300"));
assert.ok(!/G28|Z-|M8|M2\b/.test(g)); // Marlin: never ask for Z below 0
// negative depth punches toward +Z
assert.ok(brailleToGcode("⠁", { ...s, dotDepth: -0.5 }).includes("G1 Z5.50 F300"));
// GRBL laser: one pulse per dot, G4 in seconds, no Marlin-only M400, laser off at the end
const l = brailleToGcode("⠁⠿", { ...s, machine: "grbl", laserPower: 80, laserPulse: 100 });
assert.equal(l.match(/^M3 S800\nG4 P0\.100\nM5$/gm)?.length, 7);
assert.ok(!/M400|G1 Z/.test(l));
assert.ok(/^M5 /m.test(l.split("G1 X0 Y0")[1]));
// Makeblock mLaser: wait for the move, M4 P0..255, Marlin G4 in ms, laser off at the end
const m = brailleToGcode("⠁⠿", { ...s, machine: "mlaser", laserPower: 94, laserPulse: 100 });
assert.equal(m.match(/^M400\nM4 P240\nG4 P100\nM4 P0$/gm)?.length, 7);
assert.ok(!/G1 Z|M3|M5/.test(m));
assert.ok(/^M4 P0 /m.test(m.split("G1 X0 Y0")[1]));
console.log("ok");
