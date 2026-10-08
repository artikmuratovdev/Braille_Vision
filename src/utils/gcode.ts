export const DOT_PATTERNS: Record<string, number[]> = {
  '⠀': [0,0,0,0,0,0], '⠁': [1,0,0,0,0,0], '⠃': [1,1,0,0,0,0],
  '⠉': [1,0,0,1,0,0], '⠙': [1,0,0,1,1,0], '⠑': [1,0,0,0,1,0],
  '⠋': [1,1,0,1,0,0], '⠛': [1,1,0,1,1,0], '⠓': [1,1,0,0,1,0],
  '⠊': [0,1,0,1,0,0], '⠚': [0,1,0,1,1,0], '⠅': [1,0,1,0,0,0],
  '⠇': [1,1,1,0,0,0], '⠍': [1,0,1,1,0,0], '⠝': [1,0,1,1,1,0],
  '⠕': [1,0,1,0,1,0], '⠏': [1,1,1,1,0,0], '⠟': [1,1,1,1,1,0],
  '⠗': [1,1,1,0,1,0], '⠎': [0,1,1,1,0,0], '⠞': [0,1,1,1,1,0],
  '⠥': [1,0,1,0,0,1], '⠧': [1,1,1,0,0,1], '⠺': [0,1,0,1,1,1],
  '⠭': [1,0,1,1,0,1], '⠽': [1,0,1,1,1,1], '⠵': [1,0,1,0,1,1],
  '⠂': [0,1,0,0,0,0], '⠲': [0,1,1,0,1,1], '⠖': [0,0,1,1,1,0],
  '⠦': [0,0,1,0,1,1], '⠒': [0,1,0,0,1,0], '⠆': [0,1,1,0,0,0],
  '⠤': [0,0,1,1,0,0], '⠡': [1,0,1,0,0,0], '⠩': [0,1,0,0,1,1],
  '⠄': [0,0,1,0,0,0], '⠐': [0,0,0,1,0,0], '⠿': [1,1,1,1,1,1]
};

export interface GcodeSettings {
  dotSpacing: number;
  dotDepth: number;
  startX: number;
  startY: number;
  feedRate: number;
  drillRate: number;
  safeZ: number;
  /**
   * marlin = Z motor presses the dot; the others burn it with a laser:
   * mlaser = Makeblock mLaser firmware (Marlin 1.0.2 fork, laser = M4 P0..255), grbl = GRBL 1.1.
   */
  machine: 'marlin' | 'mlaser' | 'grbl';
  /** Laser power, % (GRBL: S = % x 10, assumes $30=1000; mLaser: P = % x 2.55). */
  laserPower: number;
  /** How long the laser stays on per dot, ms. */
  laserPulse: number;
}

export const DEFAULT_SETTINGS: GcodeSettings = {
  dotSpacing: 2.5,
  dotDepth: 0.5,
  startX: 10,
  startY: 10,
  feedRate: 1200,
  drillRate: 300,
  safeZ: 5,
  machine: 'marlin',
  laserPower: 80,
  laserPulse: 100,
};

/**
 * Z rest position. Marlin's software endstops never let Z go below 0, so the head's rest
 * position is declared as a positive height (G92) and a punch moves Z between rest and rest − depth.
 * A negative depth punches toward +Z, for machines whose Z motor presses in that direction.
 */
export const zRestGcode = (s: GcodeSettings) => `G92 Z${s.safeZ}`;

/** G-code for one dot at the current X/Y: Z press (Marlin) or a laser pulse (GRBL). */
export function punchGcode(s: GcodeSettings): string {
  // GRBL's G4 P is seconds (Marlin's is ms). M3 = constant power, also while standing still.
  if (s.machine === 'grbl') return `M3 S${Math.round(s.laserPower * 10)}\nG4 P${(s.laserPulse / 1000).toFixed(3)}\nM5\n`;
  // M4 runs as soon as it's parsed, while the move may still be in the planner: M400 waits for it.
  if (s.machine === 'mlaser') return `M400\nM4 P${Math.round(s.laserPower * 2.55)}\nG4 P${Math.round(s.laserPulse)}\nM4 P0\n`;
  return `G1 Z${(s.safeZ - s.dotDepth).toFixed(2)} F${s.drillRate}\nG1 Z${s.safeZ} F${s.drillRate}\n`;
}

export function countDots(brailleText: string): number {
  if (!brailleText) return 0;
  let count = 0;
  for (let i = 0; i < brailleText.length; i++) {
    const char = brailleText[i];
    const pattern = DOT_PATTERNS[char];
    if (pattern) {
      count += pattern.reduce((a, b) => a + b, 0);
    }
  }
  return count;
}

export function estimatePrintArea(brailleText: string, settings: GcodeSettings): { width: number, height: number } {
  if (!brailleText) return { width: 0, height: 0 };
  const lines = brailleText.split('\n');
  const maxCols = Math.max(...lines.map(line => line.length));
  
  const cellWidth = settings.dotSpacing * 2.5;
  const cellGapX = settings.dotSpacing;
  const rowGap = settings.dotSpacing * 2;
  const cellHeight = settings.dotSpacing * 3.5;

  const width = maxCols * cellWidth + Math.max(0, maxCols - 1) * cellGapX;
  const height = lines.length * cellHeight + Math.max(0, lines.length - 1) * rowGap;

  return { width, height };
}

export function brailleToGcode(brailleText: string, settings: GcodeSettings): string {
  if (!brailleText) return '';
  
  const lines = brailleText.split('\n');
  const dotCount = countDots(brailleText);
  const charCount = brailleText.length;
  
  let gcode = `; === Braille G-code ===
; Generated: ${new Date().toISOString()}
; Dot spacing: ${settings.dotSpacing}mm | Depth: ${settings.dotDepth}mm
; Characters: ${charCount} | Dots: ${dotCount}
G21      ; Metric units
G90      ; Absolute positioning
${zRestGcode(settings)}  ; Head must be at rest (up) now
`;

  const cellWidth = settings.dotSpacing * 2.5;
  const cellGapX = settings.dotSpacing;
  const rowGap = settings.dotSpacing * 2;
  const cellHeight = settings.dotSpacing * 3.5;

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      const pattern = DOT_PATTERNS[char];
      if (!pattern) continue;

      const cx = settings.startX + col * (cellWidth + cellGapX);
      const ry = settings.startY + row * (cellHeight + rowGap);

      const dotPositions = [
        { x: cx, y: ry },
        { x: cx, y: ry + settings.dotSpacing },
        { x: cx, y: ry + settings.dotSpacing * 2 },
        { x: cx + settings.dotSpacing, y: ry },
        { x: cx + settings.dotSpacing, y: ry + settings.dotSpacing },
        { x: cx + settings.dotSpacing, y: ry + settings.dotSpacing * 2 }
      ];

      for (let d = 0; d < 6; d++) {
        if (pattern[d] === 1) {
          const px = dotPositions[d].x;
          const py = dotPositions[d].y;
          gcode += `G1 X${px.toFixed(2)} Y${py.toFixed(2)} F${settings.feedRate}\n`;
          gcode += punchGcode(settings);
        }
      }
    }
  }

  gcode += `G1 X0 Y0 F${settings.feedRate}  ; Back to work zero
${{ marlin: 'M400     ; Wait until all moves finish', mlaser: 'M4 P0    ; Laser off', grbl: 'M5       ; Laser off' }[settings.machine]}
`;

  return gcode;
}
