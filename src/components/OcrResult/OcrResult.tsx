import styles from './OcrResult.module.css';

interface OcrResultProps {
  text: string;
  onChange: (text: string) => void;
}

export default function OcrResult({ text, onChange }: OcrResultProps) {
  if (!text) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>OCR Result</span>
        <div className={styles.actions}>
          <span className={styles.stats}>{text.length} chars</span>
          <button className={styles.copyBtn} onClick={handleCopy}>Copy</button>
        </div>
      </div>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
      />
    </div>
  );
}
