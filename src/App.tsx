import { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/genai/web";
import { Camera, Download, Grip, KeyRound, LoaderCircle, Settings as SettingsIcon, Sparkles, TriangleAlert, Upload } from "lucide-react";
import CameraCapture from "./components/CameraCapture/CameraCapture";
import FileUpload from "./components/FileUpload/FileUpload";
import Pipeline from "./components/Pipeline/Pipeline";
import Settings from "./components/Settings/Settings";
import OcrResult from "./components/OcrResult/OcrResult";
import BrailleOutput from "./components/BrailleOutput/BrailleOutput";
import GcodeOutput from "./components/GcodeOutput/GcodeOutput";
import PrinterControl from "./components/PrinterControl/PrinterControl";
import { textToBraille } from "./utils/braille";
import { brailleToGcode, GcodeSettings } from "./utils/gcode";
import styles from "./App.module.css";

type PipelineState = "idle" | "loading" | "done" | "error";

export default function App() {
  // Without HTTPS (phone over plain Wi-Fi) the live camera is blocked, so start on Upload.
  const [activeTab, setActiveTab] = useState<"camera" | "file">(
    navigator.mediaDevices?.getUserMedia ? "camera" : "file",
  );
  const [resultTab, setResultTab] = useState<"ocr" | "braille" | "gcode">("ocr");
  const [imageData, setImageData] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [ocrText, setOcrText] = useState<string>("");
  const [brailleText, setBrailleText] = useState<string>("");
  const [gcodeText, setGcodeText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [pipeline, setPipeline] = useState<{
    capture: "idle" | "done";
    ocr: PipelineState;
    braille: "idle" | "done";
    gcode: "idle" | "done";
  }>({
    capture: "idle",
    ocr: "idle",
    braille: "idle",
    gcode: "idle",
  });

  const [settings, setSettings] = useState<GcodeSettings>({
    dotSpacing: 2.5,
    dotDepth: 0.5,
    startX: 10,
    startY: 10,
    feedRate: 1200,
    drillRate: 300,
    safeZ: 5,
  });

  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) setGeminiKey(savedKey);

    const savedSettings = localStorage.getItem("gcode_settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const handleKeyChange = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem("gemini_api_key", key);
  };

  const handleSettingsChange = (newSettings: GcodeSettings) => {
    setSettings(newSettings);
    localStorage.setItem("gcode_settings", JSON.stringify(newSettings));

    // Re-generate G-code if we already have braille text
    if (brailleText) {
      const gcode = brailleToGcode(brailleText, newSettings);
      setGcodeText(gcode);
    }
  };

  const handleImageCapture = (data: {
    base64: string;
    mimeType: string;
    previewUrl: string;
  }) => {
    if (data.base64) {
      setImageData(data);
      setPipeline((prev) => ({
        ...prev,
        capture: "done",
        ocr: "idle",
        braille: "idle",
        gcode: "idle",
      }));
      setOcrText("");
      setBrailleText("");
      setGcodeText("");
      setError(null);
    } else {
      setImageData(null);
      setPipeline((prev) => ({ ...prev, capture: "idle" }));
    }
  };

  const handleProcess = async () => {
    if (!imageData) {
      setError("Please capture or upload an image first.");
      return;
    }
    if (!geminiKey) {
      setError("Please enter your Gemini API key in Settings.");
      return;
    }

    setError(null);
    setPipeline((prev) => ({
      ...prev,
      ocr: "loading",
      braille: "idle",
      gcode: "idle",
    }));

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              text: "Extract all text from this image exactly as written. Return only the raw text content, preserving original line breaks. Do not add explanations, markdown formatting, or commentary.",
            },
            {
              inlineData: {
                data: imageData.base64,
                mimeType: imageData.mimeType,
              },
            },
          ],
        },
      });

      const extractedText = response.text?.trim() || "";
      if (!extractedText) {
        throw new Error("No text extracted from the image.");
      }

      setOcrText(extractedText);
      setPipeline((prev) => ({ ...prev, ocr: "done" }));

      const braille = textToBraille(extractedText);
      setBrailleText(braille);
      setPipeline((prev) => ({ ...prev, braille: "done" }));

      const gcode = brailleToGcode(braille, settings);
      setGcodeText(gcode);
      setPipeline((prev) => ({ ...prev, gcode: "done" }));
      setResultTab("ocr");
      // Phones: results sit below the photo, bring them into view.
      if (matchMedia("(max-width: 1023px)").matches)
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process image.");
      setPipeline((prev) => ({ ...prev, ocr: "error" }));
    }
  };

  const handleOcrChange = (text: string) => {
    setOcrText(text);
    const braille = textToBraille(text);
    setBrailleText(braille);
    const gcode = brailleToGcode(braille, settings);
    setGcodeText(gcode);
  };

  const handleDownloadGcode = () => {
    if (!gcodeText) return;
    const blob = new Blob([gcodeText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `braille_output_${new Date().getTime()}.gcode`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const isGcodeReady = pipeline.gcode === "done" && !!gcodeText;
  const isLoading = pipeline.ocr === "loading";
  const resultTabs = [
    { id: "ocr", label: "Text" },
    { id: "braille", label: "Braille" },
    { id: "gcode", label: "G-code" },
  ] as const;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Grip size={20} />
          </span>
          <span className={styles.brandName}>Braille Vision</span>
        </div>
        <button
          className={styles.iconBtn}
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        geminiKey={geminiKey}
        onKeyChange={handleKeyChange}
      />

      <main className={styles.layout}>
        <section className={styles.inputCol} aria-label="Input">
          {!geminiKey && (
            <div className={styles.keyBanner}>
              <KeyRound size={20} />
              <div>
                <strong>Add your Gemini API key</strong>
                <p>Needed to read text from photos. It stays on this device.</p>
              </div>
              <button className={styles.keyBtn} onClick={() => setIsSettingsOpen(true)}>
                Add key
              </button>
            </div>
          )}

          <div className={styles.card}>
            <div className={styles.segmented} role="tablist" aria-label="Input source">
              <button
                role="tab"
                aria-selected={activeTab === "camera"}
                onClick={() => setActiveTab("camera")}
              >
                <Camera size={16} /> Camera
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "file"}
                onClick={() => setActiveTab("file")}
              >
                <Upload size={16} /> Upload
              </button>
            </div>

            {activeTab === "camera" ? (
              <CameraCapture onCapture={handleImageCapture} />
            ) : (
              <FileUpload onUpload={handleImageCapture} />
            )}

            <Pipeline state={pipeline} />

            {error && (
              <div className={styles.errorBanner} role="alert">
                <TriangleAlert size={18} /> {error}
              </div>
            )}

            <div className={styles.actionBar}>
              <button
                className={styles.primaryBtn}
                onClick={isGcodeReady ? handleDownloadGcode : handleProcess}
                disabled={!imageData || isLoading}
              >
                {isLoading ? (
                  <>
                    <LoaderCircle size={20} className={styles.spin} /> Reading text…
                  </>
                ) : isGcodeReady ? (
                  <>
                    <Download size={20} /> Download G-code
                  </>
                ) : (
                  <>
                    <Sparkles size={20} /> Convert to Braille
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <section id="results" className={styles.resultsCol} aria-label="Results">
          {ocrText ? (
            <>
              <div className={`${styles.segmented} ${styles.resultTabs}`} role="tablist" aria-label="Result view">
                {resultTabs.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={resultTab === t.id}
                    onClick={() => setResultTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className={styles.results}>
                <div className={styles.result} data-active={resultTab === "ocr"} data-area="ocr">
                  <OcrResult text={ocrText} onChange={handleOcrChange} />
                </div>
                <div className={styles.result} data-active={resultTab === "braille"} data-area="braille">
                  <BrailleOutput originalText={ocrText} />
                </div>
                {gcodeText && (
                  <div className={styles.result} data-active={resultTab === "gcode"} data-area="gcode">
                    <GcodeOutput
                      gcode={gcodeText}
                      brailleText={brailleText}
                      settings={settings}
                      onDownload={handleDownloadGcode}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyMark} aria-hidden="true">⠃⠧</span>
              <h2>Photo → Braille in one tap</h2>
              <ol>
                <li>Take a photo of a printed page or upload one</li>
                <li>Press <strong>Convert to Braille</strong></li>
                <li>Check the text, then download the G-code</li>
              </ol>
            </div>
          )}

          <PrinterControl gcode={gcodeText} settings={settings} />
        </section>
      </main>
    </div>
  );
}
