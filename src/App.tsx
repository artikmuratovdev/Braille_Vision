import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai/web';
import CameraCapture from './components/CameraCapture/CameraCapture';
import FileUpload from './components/FileUpload/FileUpload';
import Pipeline from './components/Pipeline/Pipeline';
import Settings from './components/Settings/Settings';
import OcrResult from './components/OcrResult/OcrResult';
import BrailleOutput from './components/BrailleOutput/BrailleOutput';
import GcodeOutput from './components/GcodeOutput/GcodeOutput';
import { textToBraille } from './utils/braille';
import { brailleToGcode, GcodeSettings } from './utils/gcode';
import styles from './App.module.css';

type PipelineState = 'idle' | 'loading' | 'done' | 'error';

export default function App() {
  const [activeTab, setActiveTab] = useState<'camera' | 'file'>('camera');
  const [mobileResultTab, setMobileResultTab] = useState<'ocr' | 'braille' | 'gcode'>('ocr');
  const [imageData, setImageData] = useState<{ base64: string, mimeType: string, previewUrl: string } | null>(null);
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [ocrText, setOcrText] = useState<string>('');
  const [brailleText, setBrailleText] = useState<string>('');
  const [gcodeText, setGcodeText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [pipeline, setPipeline] = useState<{
    capture: 'idle' | 'done';
    ocr: PipelineState;
    braille: 'idle' | 'done';
    gcode: 'idle' | 'done';
  }>({
    capture: 'idle',
    ocr: 'idle',
    braille: 'idle',
    gcode: 'idle'
  });

  const [settings, setSettings] = useState<GcodeSettings>({
    dotSpacing: 2.5,
    dotDepth: 0.5,
    startX: 10,
    startY: 10,
    feedRate: 1200,
    drillRate: 300,
    safeZ: 5
  });

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setGeminiKey(savedKey);

    const savedSettings = localStorage.getItem('gcode_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  const handleKeyChange = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleSettingsChange = (newSettings: GcodeSettings) => {
    setSettings(newSettings);
    localStorage.setItem('gcode_settings', JSON.stringify(newSettings));
    
    // Re-generate G-code if we already have braille text
    if (brailleText) {
      const gcode = brailleToGcode(brailleText, newSettings);
      setGcodeText(gcode);
    }
  };

  const handleImageCapture = (data: { base64: string, mimeType: string, previewUrl: string }) => {
    if (data.base64) {
      setImageData(data);
      setPipeline(prev => ({ ...prev, capture: 'done', ocr: 'idle', braille: 'idle', gcode: 'idle' }));
      setOcrText('');
      setBrailleText('');
      setGcodeText('');
      setError(null);
    } else {
      setImageData(null);
      setPipeline(prev => ({ ...prev, capture: 'idle' }));
    }
  };

  const handleProcess = async () => {
    if (!imageData) {
      setError('Please capture or upload an image first.');
      return;
    }
    if (!geminiKey) {
      setError('Please enter your Gemini API key in Settings.');
      return;
    }

    setError(null);
    setPipeline(prev => ({ ...prev, ocr: 'loading', braille: 'idle', gcode: 'idle' }));

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              text: "Extract all text from this image exactly as written. Return only the raw text content, preserving original line breaks. Do not add explanations, markdown formatting, or commentary."
            },
            {
              inlineData: {
                data: imageData.base64,
                mimeType: imageData.mimeType
              }
            }
          ]
        }
      });

      const extractedText = response.text?.trim() || '';
      if (!extractedText) {
        throw new Error('No text extracted from the image.');
      }

      setOcrText(extractedText);
      setPipeline(prev => ({ ...prev, ocr: 'done' }));

      const braille = textToBraille(extractedText);
      setBrailleText(braille);
      setPipeline(prev => ({ ...prev, braille: 'done' }));

      const gcode = brailleToGcode(braille, settings);
      setGcodeText(gcode);
      setPipeline(prev => ({ ...prev, gcode: 'done' }));

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process image.');
      setPipeline(prev => ({ ...prev, ocr: 'error' }));
    }
  };

  const handleOcrChange = (text: string) => {
    setOcrText(text);
    const braille = textToBraille(text);
    setBrailleText(braille);
    const gcode = brailleToGcode(braille, settings);
    setGcodeText(gcode);
  };

  return (
    <div className={styles.appWrapper}>
      <header className={styles.header}>
        <h1 className={styles.logo}>BRAILLE·OCR</h1>
        <button className={styles.settingsBtn} onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
          ⚙
        </button>
      </header>

      <Settings 
        isOpen={isSettingsOpen} 
        settings={settings} 
        onSettingsChange={handleSettingsChange}
        geminiKey={geminiKey}
        onKeyChange={handleKeyChange}
      />

      <div className={styles.tabBar}>
        <button 
          className={`${styles.tab} ${activeTab === 'camera' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('camera')}
        >
          📷 Camera
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'file' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('file')}
        >
          📁 File
        </button>
      </div>

      <main className={styles.main}>
        {!geminiKey && (
          <div className={styles.warningBanner}>
            <div style={{ marginBottom: '8px' }}>⚠️ Please enter your Gemini API key to continue.</div>
            <input 
              type="password" 
              placeholder="AIzaSy..." 
              value={geminiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              className={styles.apiKeyInput}
            />
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                Get API key →
              </a>
            </div>
          </div>
        )}

        <div className={styles.dashboardGrid}>
          <section className={styles.capturePanel}>
            <div className={styles.panelHeader}>INPUT</div>

            {activeTab === 'camera' ? (
              <CameraCapture onCapture={handleImageCapture} />
            ) : (
              <FileUpload onUpload={handleImageCapture} />
            )}

            <Pipeline state={pipeline} />

            {error && <div className={styles.errorBanner}>{error}</div>}

            <button 
              className={`${styles.processBtn} ${pipeline.ocr === 'loading' ? styles.loading : ''}`}
              onClick={handleProcess}
              disabled={!imageData || pipeline.ocr === 'loading'}
            >
              {pipeline.ocr === 'loading' ? (
                <>
                  <span className={styles.spinner}></span>
                  PROCESSING...
                </>
              ) : (
                'PROCESS IMAGE'
              )}
            </button>
          </section>

          <section className={`${styles.outputPanel} ${styles.desktopPanel}`}>
            <div className={styles.panelHeader}>BRAILLE OUTPUT</div>
            <BrailleOutput originalText={ocrText} />
          </section>

          <section className={`${styles.ocrPanel} ${styles.desktopPanel}`}>
            <div className={styles.panelHeader}>OCR TEXT</div>
            <OcrResult text={ocrText} onChange={handleOcrChange} />
            <GcodeOutput gcode={gcodeText} brailleText={brailleText} settings={settings} />
          </section>

          <section className={`${styles.mobileResultPanel} ${styles.mobileOnly}`}>
            <div className={styles.mobileResultTabs}>
              <button
                className={`${styles.mobileResultTab} ${mobileResultTab === 'ocr' ? styles.activeMobileResultTab : ''}`}
                onClick={() => setMobileResultTab('ocr')}
              >
                OCR TEXT
              </button>
              <button
                className={`${styles.mobileResultTab} ${mobileResultTab === 'braille' ? styles.activeMobileResultTab : ''}`}
                onClick={() => setMobileResultTab('braille')}
              >
                BRAILLE OUTPUT
              </button>
              <button
                className={`${styles.mobileResultTab} ${mobileResultTab === 'gcode' ? styles.activeMobileResultTab : ''}`}
                onClick={() => setMobileResultTab('gcode')}
              >
                G-CODE
              </button>
            </div>

            {mobileResultTab === 'ocr' && (
              <>
                <div className={styles.panelHeader}>OCR TEXT</div>
                <OcrResult text={ocrText} onChange={handleOcrChange} />
              </>
            )}

            {mobileResultTab === 'braille' && (
              <>
                <div className={styles.panelHeader}>BRAILLE OUTPUT</div>
                <BrailleOutput originalText={ocrText} />
              </>
            )}

            {mobileResultTab === 'gcode' && (
              <>
                <div className={styles.panelHeader}>G-CODE</div>
                <GcodeOutput gcode={gcodeText} brailleText={brailleText} settings={settings} />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
