// Runs the USB bridge and the Vite dev server together: `npm run dev:all` / `npm run phone:all`.
// Ctrl+C stops both (the console sends it to every child).
import { spawn } from "node:child_process";

const mode = process.argv[2]; // "phone" = HTTPS for the phone camera
const viteArgs = ["node_modules/vite/bin/vite.js", "--port=3000", "--host=0.0.0.0", "--strictPort", ...(mode ? ["--mode", mode] : [])];

const bridge = spawn("python", ["-u", "server/bridge.py"], { stdio: "inherit" });
const vite = spawn(process.execPath, viteArgs, { stdio: "inherit" });

// A bridge that exits early (e.g. one is already running on 3001) leaves Vite up; the app still works.
bridge.on("exit", (code) => code && console.log(`[bridge] exited (${code}); Vite keeps running.`));
bridge.on("error", (e) => console.log(`[bridge] could not start Python: ${e.message}`));
vite.on("exit", (code) => {
  bridge.kill();
  process.exit(code ?? 0);
});
