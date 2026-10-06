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
}

/**
 * Z rest position. Marlin's software endstops never let Z go below 0, so the head's rest
 * position is declared as a positive height (G92) and a punch moves Z between rest and rest − depth.
 * A negative depth punches toward +Z, for machines whose Z motor presses in that direction.
 */
export const zRestGcode = (s: GcodeSettings) => `G92 Z${s.safeZ}`;

/** G-code that presses one dot at the current X/Y with the Z motor and returns to rest. */
export function punchGcode(s: GcodeSettings): string {
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
M400     ; Wait until all moves finish
`;

  return gcode;
}
