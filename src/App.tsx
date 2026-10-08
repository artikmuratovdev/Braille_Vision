import { useState, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { Camera, Download, FileText, Grip, LoaderCircle, Printer, Settings as SettingsIcon, Sparkles, TriangleAlert, Upload } from "lucide-react";
import CameraCapture from "./components/CameraCapture/CameraCapture";
import FileUpload from "./components/FileUpload/FileUpload";
import Pipeline from "./components/Pipeline/Pipeline";
import Settings from "./components/Settings/Settings";
import OcrResult from "./components/OcrResult/OcrResult";
import BrailleOutput from "./components/BrailleOutput/BrailleOutput";
import GcodeOutput from "./components/GcodeOutput/GcodeOutput";
import PrinterControl from "./components/PrinterControl/PrinterControl";
import { textToBraille } from "./utils/braille";
import { brailleToGcode, DEFAULT_SETTINGS, GcodeSettings } from "./utils/gcode";
import styles from "./App.module.css";

type PipelineState = "idle" | "loading" | "done" | "error";

// One worker per page: language data (~10 MB) downloads once, then is cached in IndexedDB.
let tesseractWorker: ReturnType<typeof createWorker> | null = null;
async function tesseractOcr(previewUrl: string) {
  tesseractWorker ??= createWorker("uzb+rus+eng");
  const worker = await tesseractWorker;
  // onload, not img.decode(): decode() never settles while the tab is in the background.
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not load the image."));
    i.src = previewUrl;
  });

  // Tesseract only reads upright text (rotateAuto fixes small tilt), so try each quarter turn and keep the surest.
  // ponytail: up to 4 passes on sideways photos; switch to worker.detect() (needs legacy OSD model) if too slow.
  let best = { text: "", confidence: -1 };
  for (const turns of [0, 1, 3, 2]) {
    const { data } = await worker.recognize(rotate(img, turns), { rotateAuto: true });
    if (data.confidence > best.confidence) best = { text: data.text.trim(), confidence: data.confidence };
    if (best.confidence >= 75) break;
  }
  return best.text;
}

// Draws the image turned by `turns` × 90° clockwise; drawImage also applies the photo's EXIF orientation.
function rotate(img: HTMLImageElement, turns: number) {
  const canvas = document.createElement("canvas");
  const swap = turns % 2 === 1;
  canvas.width = swap ? img.naturalHeight : img.naturalWidth;
  canvas.height = swap ? img.naturalWidth : img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turns * Math.PI) / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvas;
}

export default function App() {
  // Without HTTPS (phone over plain Wi-Fi) the live camera is blocked, so start on Upload.
  const [activeTab, setActiveTab] = useState<"camera" | "file">(
    navigator.mediaDevices?.getUserMedia ? "camera" : "file",
  );
  const [resultTab, setResultTab] = useState<"ocr" | "braille" | "gcode">("ocr");
  // Phones show one section at a time, switched from the bottom nav; laptops show everything (CSS).
  const [view, setView] = useState<"capture" | "results" | "printer">("capture");
  const [imageData, setImageData] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);
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

  const [settings, setSettings] = useState<GcodeSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const savedSettings = localStorage.getItem("gcode_settings");
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

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
    setError(null);
    setPipeline((prev) => ({
      ...prev,
      ocr: "loading",
      braille: "idle",
      gcode: "idle",
    }));

    try {
      const extractedText = await tesseractOcr(imageData.previewUrl);
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
      goTo("results");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process image.");
      setPipeline((prev) => ({ ...prev, ocr: "error" }));
    }
  };

  const goTo = (v: typeof view) => {
    setView(v);
    window.scrollTo({ top: 0 });
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
  const navItems = [
    { id: "capture", label: "Photo", Icon: Camera, dot: false },
    { id: "results", label: "Results", Icon: FileText, dot: !!ocrText && view !== "results" },
    { id: "printer", label: "Printer", Icon: Printer, dot: false },
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
      />

      <main className={styles.layout} data-view={view}>
        <section className={styles.inputCol} aria-label="Input">
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
          <div className={styles.resultsPane}>
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
          </div>

          <div className={styles.printerPane}>
            <PrinterControl gcode={gcodeText} settings={settings} />
          </div>
        </section>
      </main>

      <nav className={styles.bottomNav} aria-label="Sections">
        {navItems.map(({ id, label, Icon, dot }) => (
          <button key={id} aria-current={view === id ? "page" : undefined} onClick={() => goTo(id)}>
            <span className={styles.navIcon}>
              <Icon size={22} />
              {dot && <span className={styles.navDot} aria-label="ready" />}
            </span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
