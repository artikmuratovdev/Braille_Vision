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
    { id: 'capture', label: 'Capture', icon: '📷', status: state.capture },
    { id: 'ocr', label: 'OCR', icon: '🔍', status: state.ocr },
    { id: 'braille', label: 'Braille', icon: '⠿', status: state.braille },
    { id: 'gcode', label: 'G-code', icon: '⚙', status: state.gcode }
  ];

  return (
    <div className={styles.container}>
      {steps.map((step, index) => (
        <div key={step.id} className={styles.stepWrapper}>
          <div className={`${styles.step} ${styles[step.status]}`}>
            <div className={styles.iconContainer}>
              <span className={styles.icon}>{step.icon}</span>
              {step.status === 'done' && <span className={styles.badge}>✓</span>}
              {step.status === 'error' && <span className={`${styles.badge} ${styles.errorBadge}`}>✕</span>}
            </div>
            <span className={styles.label}>{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`${styles.line} ${steps[index + 1].status !== 'idle' ? styles.lineActive : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}
