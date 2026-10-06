import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { GcodeSettings } from '../../utils/gcode';
import styles from './Settings.module.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GcodeSettings;
  onSettingsChange: (newSettings: GcodeSettings) => void;
  geminiKey: string;
  onKeyChange: (key: string) => void;
}

const FIELDS: { name: keyof GcodeSettings; label: string; unit: string; step?: number }[] = [
  { name: 'dotSpacing', label: 'Dot spacing', unit: 'mm', step: 0.1 },
  { name: 'dotDepth', label: 'Dot depth', unit: 'mm', step: 0.1 },
  { name: 'startX', label: 'Start X', unit: 'mm' },
  { name: 'startY', label: 'Start Y', unit: 'mm' },
  { name: 'feedRate', label: 'Feed rate', unit: 'mm/min', step: 50 },
  { name: 'drillRate', label: 'Drill rate', unit: 'mm/min', step: 50 },
  { name: 'safeZ', label: 'Safe Z', unit: 'mm', step: 0.5 },
];

export default function Settings({ isOpen, onClose, settings, onSettingsChange, geminiKey, onKeyChange }: SettingsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [localKey, setLocalKey] = useState(geminiKey);

  useEffect(() => setLocalKey(geminiKey), [geminiKey]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog?.open) dialog?.showModal();
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      onClose={() => {
        onKeyChange(localKey);
        onClose();
      }}
      // Click on the backdrop closes the sheet
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
      aria-labelledby="settings-title"
    >
      <div className={styles.header}>
        <h2 id="settings-title">Settings</h2>
        <button className={styles.close} onClick={() => dialogRef.current?.close()} aria-label="Close settings">
          <X size={20} />
        </button>
      </div>

      <div className={styles.body}>
        <section className={styles.section}>
          <label className={styles.label} htmlFor="gemini-key">
            <KeyRound size={16} /> Gemini API key
          </label>
          <input
            id="gemini-key"
            type="password"
            autoComplete="off"
            className={styles.input}
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            onBlur={() => onKeyChange(localKey)}
            placeholder="AIzaSy..."
          />
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className={styles.link}>
            Get a free API key →
          </a>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Machine</h3>
          <div className={styles.grid}>
            {FIELDS.map(({ name, label, unit, step }) => (
              <label key={name} className={styles.field}>
                <span className={styles.fieldLabel}>{label}</span>
                <span className={styles.inputWrap}>
                  <input
                    type="number"
                    inputMode="decimal"
                    name={name}
                    step={step ?? 1}
                    value={settings[name]}
                    onChange={handleChange}
                    className={styles.input}
                  />
                  <span className={styles.unit}>{unit}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </dialog>
  );
}
