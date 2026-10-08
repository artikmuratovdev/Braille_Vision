import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { GcodeSettings } from '../../utils/gcode';
import styles from './Settings.module.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GcodeSettings;
  onSettingsChange: (newSettings: GcodeSettings) => void;
}

type Machine = GcodeSettings['machine'];

const FIELDS: { name: Exclude<keyof GcodeSettings, 'machine'>; label: string; unit: string; step?: number; only?: 'marlin' | 'laser' }[] = [
  { name: 'dotSpacing', label: 'Dot spacing', unit: 'mm', step: 0.1 },
  { name: 'dotDepth', label: 'Punch depth (− = +Z)', unit: 'mm', step: 0.1, only: 'marlin' },
  { name: 'startX', label: 'Start X', unit: 'mm' },
  { name: 'startY', label: 'Start Y', unit: 'mm' },
  { name: 'feedRate', label: 'Feed rate', unit: 'mm/min', step: 50 },
  { name: 'drillRate', label: 'Punch speed', unit: 'mm/min', step: 50, only: 'marlin' },
  { name: 'safeZ', label: 'Z rest', unit: 'mm', step: 0.5, only: 'marlin' },
  { name: 'laserPower', label: 'Laser power', unit: '%', step: 5, only: 'laser' },
  { name: 'laserPulse', label: 'Laser time per dot', unit: 'ms', step: 10, only: 'laser' },
];

export default function Settings({ isOpen, onClose, settings, onSettingsChange }: SettingsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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
      onClose={onClose}
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
          <h3 className={styles.sectionTitle}>Machine</h3>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Firmware</span>
              <select
                className={styles.input}
                value={settings.machine}
                onChange={(e) => onSettingsChange({ ...settings, machine: e.target.value as Machine })}
              >
                <option value="marlin">Marlin — Z punch</option>
                <option value="mlaser">Makeblock mLaser — laser</option>
                <option value="grbl">GRBL — laser</option>
              </select>
            </label>
            {FIELDS.filter((f) => !f.only || f.only === (settings.machine === 'marlin' ? 'marlin' : 'laser')).map(({ name, label, unit, step }) => (
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
