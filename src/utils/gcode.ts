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
G28      ; Home all axes
G0 Z${settings.safeZ} F${settings.feedRate}
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
          gcode += `G0 Z${settings.safeZ}\n`;
          gcode += `G0 X${px.toFixed(2)} Y${py.toFixed(2)} F${settings.feedRate}\n`;
          gcode += `G1 Z-${settings.dotDepth.toFixed(2)} F${settings.drillRate}\n`;
          gcode += `G0 Z${settings.safeZ}\n`;
        }
      }
    }
  }

  gcode += `G0 Z20   ; Safe height
G28 X0 Y0 ; Park
M2       ; End program
`;

  return gcode;
}
