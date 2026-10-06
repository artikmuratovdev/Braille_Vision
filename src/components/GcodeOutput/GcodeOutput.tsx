import { Download, FileCode } from 'lucide-react';
import { countDots, estimatePrintArea, GcodeSettings } from '../../utils/gcode';
import CopyButton from '../CopyButton';
import ui from '../ui.module.css';
import styles from './GcodeOutput.module.css';

interface GcodeOutputProps {
  gcode: string;
  brailleText: string;
  settings: GcodeSettings;
  onDownload: () => void;
}

export default function GcodeOutput({ gcode, brailleText, settings, onDownload }: GcodeOutputProps) {
  const dots = countDots(brailleText);
  const area = estimatePrintArea(brailleText, settings);
  const stats = [
    ['Dots', dots],
    ['Est. time', `${Math.ceil((dots * 3) / 60)} min`], // ~3 s per dot
    ['Lines', gcode.split('\n').length],
    ['Area', `${area.width.toFixed(1)} × ${area.height.toFixed(1)} mm`],
  ];

  return (
    <div className={ui.card}>
      <div className={ui.cardHeader}>
        <span className={ui.title}>
          <FileCode size={18} className={ui.titleIcon} /> G-code
        </span>
        <div className={ui.actions}>
          <CopyButton text={gcode} />
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={onDownload} aria-label="Download .gcode">
            <Download size={16} />
            <span className={ui.btnLabel}>.gcode</span>
          </button>
        </div>
      </div>

      <dl className={styles.stats}>
        {stats.map(([label, value]) => (
          <div key={label} className={styles.stat}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <pre className={styles.pre}>
        <code>{gcode}</code>
      </pre>
    </div>
  );
}
