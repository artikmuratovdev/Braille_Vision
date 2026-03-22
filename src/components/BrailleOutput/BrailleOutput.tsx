import { brailleToOriginalMap } from '../../utils/braille';
import styles from './BrailleOutput.module.css';

interface BrailleOutputProps {
  originalText: string;
}

export default function BrailleOutput({ originalText }: BrailleOutputProps) {
  if (!originalText) return null;

  const map = brailleToOriginalMap(originalText);
  const cellCount = map.filter(m => m.braille !== '\n').length;

  const handleCopy = () => {
    navigator.clipboard.writeText(map.map(m => m.braille).join(''));
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Braille Output</span>
        <div className={styles.actions}>
          <span className={styles.stats}>{cellCount} cells</span>
          <button className={styles.copyBtn} onClick={handleCopy}>Copy</button>
        </div>
      </div>
      <div className={styles.content}>
        {map.map((item, index) => {
          if (item.braille === '\n') {
            return <div key={index} style={{ flexBasis: '100%', height: '8px' }} />;
          }
          return (
            <div key={index} className={styles.charContainer}>
              <span className={styles.brailleChar}>{item.braille}</span>
              <span className={styles.originalChar}>{item.original === ' ' ? '␣' : item.original}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
