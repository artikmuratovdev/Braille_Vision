import { ScanText } from 'lucide-react';
import CopyButton from '../CopyButton';
import ui from '../ui.module.css';
import styles from './OcrResult.module.css';

interface OcrResultProps {
  text: string;
  onChange: (text: string) => void;
}

export default function OcrResult({ text, onChange }: OcrResultProps) {
  return (
    <div className={ui.card}>
      <div className={ui.cardHeader}>
        <span className={ui.title}>
          <ScanText size={18} className={ui.titleIcon} /> Recognized text
        </span>
        <div className={ui.actions}>
          <span className={ui.meta}>{text.length} chars</span>
          <CopyButton text={text} />
        </div>
      </div>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Recognized text (editable)"
        spellCheck={false}
      />
      <p className={styles.hint}>Edit the text to fix OCR mistakes — Braille and G-code update live.</p>
    </div>
  );
}
