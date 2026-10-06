import { Camera, Check, FileCode, Grip, LoaderCircle, ScanText, X } from 'lucide-react';
import styles from './Pipeline.module.css';

interface PipelineProps {
  state: {
    capture: 'idle' | 'done';
    ocr: 'idle' | 'loading' | 'done' | 'error';
    braille: 'idle' | 'done';
    gcode: 'idle' | 'done';
  };
}

export default function Pipeline({ state }: PipelineProps) {
  const steps = [
    { label: 'Photo', Icon: Camera, status: state.capture },
    { label: 'Text', Icon: ScanText, status: state.ocr },
    { label: 'Braille', Icon: Grip, status: state.braille },
    { label: 'G-code', Icon: FileCode, status: state.gcode },
  ];

  return (
    <ol className={styles.steps} aria-label="Progress">
      {steps.map(({ label, Icon, status }) => (
        <li key={label} className={`${styles.step} ${styles[status]}`}>
          <span className={styles.dot}>
            {status === 'done' ? (
              <Check size={16} strokeWidth={3} />
            ) : status === 'loading' ? (
              <LoaderCircle size={16} className={styles.spin} />
            ) : status === 'error' ? (
              <X size={16} strokeWidth={3} />
            ) : (
              <Icon size={16} />
            )}
          </span>
          <span className={styles.label}>{label}</span>
        </li>
      ))}
    </ol>
  );
}
