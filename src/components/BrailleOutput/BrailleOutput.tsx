import { Grip } from 'lucide-react';
import { brailleToOriginalMap } from '../../utils/braille';
import CopyButton from '../CopyButton';
import ui from '../ui.module.css';
import styles from './BrailleOutput.module.css';

export default function BrailleOutput({ originalText }: { originalText: string }) {
  const map = brailleToOriginalMap(originalText);
  const cellCount = map.filter((m) => m.braille !== '\n').length;

  return (
    <div className={ui.card}>
      <div className={ui.cardHeader}>
        <span className={ui.title}>
          <Grip size={18} className={ui.titleIcon} /> Braille
        </span>
        <div className={ui.actions}>
          <span className={ui.meta}>{cellCount} cells</span>
          <CopyButton text={map.map((m) => m.braille).join('')} />
        </div>
      </div>
      <div className={styles.content}>
        {map.map((item, index) =>
          item.braille === '\n' ? (
            <div key={index} className={styles.break} />
          ) : (
            <div key={index} className={styles.cell}>
              <span className={styles.braille}>{item.braille}</span>
              <span className={styles.original}>{item.original === ' ' ? '␣' : item.original}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
