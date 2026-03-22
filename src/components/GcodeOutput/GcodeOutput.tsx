import { countDots, estimatePrintArea, GcodeSettings } from '../../utils/gcode';
import styles from './GcodeOutput.module.css';

interface GcodeOutputProps {
  gcode: string;
  brailleText: string;
  settings: GcodeSettings;
}

export default function GcodeOutput({ gcode, brailleText, settings }: GcodeOutputProps) {
  if (!gcode) return null;

  const dots = countDots(brailleText);
  const time = Math.ceil((dots * 3) / 60); // 3 seconds per dot, roughly
  const linesCount = gcode.split('\n').length;
  const area = estimatePrintArea(brailleText, settings);

  const handleCopy = () => {
    navigator.clipboard.writeText(gcode);
  };

  const handleDownload = () => {
    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `braille_output_${new Date().getTime()}.gcode`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>G-code Output</span>
        <div className={styles.actions}>
          <button className={styles.copyBtn} onClick={handleCopy}>Copy</button>
          <button className={styles.downloadBtn} onClick={handleDownload}>Download .gcode</button>
        </div>
      </div>
      
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total dots</span>
          <span className={styles.statValue}>{dots}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Est. time</span>
          <span className={styles.statValue}>{time} min</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Lines</span>
          <span className={styles.statValue}>{linesCount}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Area</span>
          <span className={styles.statValue}>{area.width.toFixed(1)} × {area.height.toFixed(1)} mm</span>
        </div>
      </div>

      <pre className={styles.pre}>
        <code>{gcode}</code>
      </pre>
    </div>
  );
}
