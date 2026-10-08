<div align="center">
   <img width="1200" height="475" alt="Braille Vision Banner" src="public/image.png" />
</div>

# Braille Vision

Braille Vision is a web app that converts text from an image into Braille and machine-ready G-code.

It combines:
- In-browser OCR with Tesseract.js (Uzbek, Russian, English; no API key)
- Text to Braille conversion
- Braille to CNC/engraver G-code generation

## What this project does

1. Capture an image from camera or upload a file.
2. Extract text with Tesseract.js OCR.
3. Convert extracted text into Braille characters.
4. Generate G-code based on configurable dot geometry and feed settings.
5. Copy or download output for printing/engraving workflows.

## Features

- Camera capture and file upload input modes
- OCR pipeline status tracking (capture, OCR, Braille, G-code)
- Editable OCR text with live Braille and G-code regeneration
- Configurable G-code parameters:
   - Dot spacing
   - Dot depth
   - Start X/Y
   - Feed rate
   - Drill rate
   - Safe Z
- Local persistence of machine settings in browser localStorage
- Dashboard-oriented responsive UI for larger displays

## Tech stack

- React 19 + TypeScript
- Vite
- Tesseract.js
- CSS Modules

## Prerequisites

- Node.js 18+ (Node.js 20+ recommended)

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open the app (default):

http://localhost:3000

The first OCR run downloads the language data (~10 MB, needs internet once); the browser caches it after that.

## Sending G-code to the printer

The Arduino (Marlin, COM3) is driven through a small Python USB bridge. Setup and calibration: [firmware/README.md](firmware/README.md).

1. Once: `python -m pip install -r server/requirements.txt`
2. Run the bridge: `npm run bridge` (keep it open), and the app: `npm run dev` or `npm run phone`. Vite proxies `/api` to the bridge, so a phone works too.
3. In the **Printer** card: **Connect** → jog the head to the paper corner → **Set zero here** → **Print**. **Stop** resets the Arduino immediately.

`npm start` builds the app and serves it from the bridge at http://localhost:3001 (no Vite needed) The bridge also prints its Wi-Fi address (`http://<ip>:3001`) for phones on the same network. That address is plain HTTP, so on a phone use the Upload tab.

## Using it from a phone

1. Connect the phone and the computer to the same Wi-Fi.
2. Run `npm run phone`. It starts Vite with a self-signed HTTPS certificate, because browsers block the live camera on plain HTTP.
3. Open the `Network: https://<ip>:3000` URL that Vite prints. Accept the certificate warning once (Advanced → Proceed).

If the page doesn't open, allow Node.js through Windows Firewall (private networks). Without HTTPS (`npm run dev`) the Upload tab still works, and it opens the phone's camera too.

## Available scripts

- `npm run dev` - Run Vite dev server on port 3000
- `npm run phone` - Same, over HTTPS for phone camera access
- `npm run bridge` - USB bridge to the printer (port 3001)
- `npx tsx scripts/check.ts` - G-code generator self-check
- `npm run build` - Create production build
- `npm run preview` - Preview production build locally
- `npm run lint` - Type-check with TypeScript (`tsc --noEmit`)
- `npm run clean` - Remove `dist` folder

## Project structure

```text
src/
   components/
      CameraCapture/   # Camera input
      FileUpload/      # File input and drag-drop
      Pipeline/        # Processing status steps
      Settings/        # API key and G-code settings
      OcrResult/       # OCR text editor/output
      BrailleOutput/   # Braille visualization
      GcodeOutput/     # G-code preview/download
   utils/
      braille.ts       # Text -> Braille mapping
      gcode.ts         # Braille -> G-code generator
   App.tsx            # Main app orchestration
```

## Configuration details

G-code is generated from 6-dot Braille cell patterns and machine parameters configured in Settings.

Important behavior:
- Unknown characters are mapped to a fallback Braille symbol.
- Editing OCR text immediately updates Braille and G-code output.
- Saved settings are loaded automatically on next visit.

## Limitations and notes

- OCR quality depends on image quality, and language. Flat, well-lit, high-contrast photos of printed text work best.
- Always validate generated G-code in your simulator/controller before running on hardware.
- Dot spacing/depth values should be calibrated for your specific toolhead and material.

## Build for production

```bash
npm run build
```

Output is generated in the `dist` directory.

## License

Add your preferred license in this repository (for example MIT) if you plan to publish or distribute.
