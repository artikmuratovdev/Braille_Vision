import React, { useState, useEffect } from 'react';
import styles from './Settings.module.css';

interface SettingsProps {
  isOpen: boolean;
  settings: any;
  onSettingsChange: (newSettings: any) => void;
  geminiKey: string;
  onKeyChange: (key: string) => void;
}

export default function Settings({ isOpen, settings, onSettingsChange, geminiKey, onKeyChange }: SettingsProps) {
  const [localKey, setLocalKey] = useState(geminiKey);

  useEffect(() => {
    setLocalKey(geminiKey);
  }, [geminiKey]);

  const handleKeyBlur = () => {
    onKeyChange(localKey);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onSettingsChange({
      ...settings,
      [name]: parseFloat(value) || 0
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <label className={styles.label}>
          Gemini API Key
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className={styles.link}>
            Get API key →
          </a>
        </label>
        <input
          type="password"
          className={styles.input}
          value={localKey}
          onChange={(e) => setLocalKey(e.target.value)}
          onBlur={handleKeyBlur}
          placeholder="AIzaSy..."
        />
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>Dot Spacing (mm)</label>
          <input type="number" name="dotSpacing" min="1" max="6" step="0.5" value={settings.dotSpacing} onChange={handleChange} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Drill Depth (mm)</label>
          <input type="number" name="dotDepth" min="0.1" max="3" step="0.1" value={settings.dotDepth} onChange={handleChange} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Start X (mm)</label>
          <input type="number" name="startX" min="0" max="300" value={settings.startX} onChange={handleChange} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Start Y (mm)</label>
          <input type="number" name="startY" min="0" max="300" value={settings.startY} onChange={handleChange} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Feed Rate (mm/min)</label>
          <input type="number" name="feedRate" value={settings.feedRate} onChange={handleChange} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Drill Rate (mm/min)</label>
          <input type="number" name="drillRate" value={settings.drillRate} onChange={handleChange} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Safe Z (mm)</label>
          <input type="number" name="safeZ" value={settings.safeZ} onChange={handleChange} className={styles.input} />
        </div>
      </div>
    </div>
  );
}
