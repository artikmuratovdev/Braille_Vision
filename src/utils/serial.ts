// Marlin over the Python bridge (server/bridge.py, fixed COM3): one line out, wait for "ok".
let events: EventSource | null = null;
let connected = false;
let pending: ((reply: string) => void) | null = null;
let queue: Promise<unknown> = Promise.resolve();
let onLine: (line: string) => void = () => {};

async function api(path: string, body: unknown = {}) {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Bridge ishlamayapti — terminalda: npm run bridge");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Bridge javob bermadi (${res.status}) — npm run bridge ishlayaptimi?`);
  }
}

function listen(log: (line: string) => void) {
  onLine = log;
  if (events) return;
  events = new EventSource("/api/events");
  events.onmessage = (e) => {
    const line: string = JSON.parse(e.data);
    onLine(line);
    // Marlin's boot "start" (after a reset) also releases a waiting command, so stop() never hangs.
    // Line noise can glue junk onto the reply ("oMGok"), so a trailing "ok" counts too.
    if (pending && /^(ok|Error|start)|ok$/.test(line)) {
      const resolve = pending;
      pending = null;
      resolve(/ok$/.test(line) ? "ok" : line);
    }
  };
}

export const isConnected = () => connected;

export async function connect(log: (line: string) => void) {
  listen(log);
  await api("connect");
  connected = true;
}

export async function disconnect() {
  connected = false;
  await api("disconnect").catch(() => {});
  pending?.("error: disconnected");
  pending = null;
}

/** Send one G-code line and resolve with Marlin's reply ("ok", "Error:...", "start" after reset). */
export function sendLine(line: string): Promise<string> {
  const run = () =>
    new Promise<string>((resolve, reject) => {
      if (!connected) return reject(new Error("Printer ulanmagan"));
      pending = resolve;
      onLine(`> ${line}`);
      api("write", { data: line + "\n" }).catch((e) => {
        pending = null;
        reject(e);
      });
    });
  const result = queue.then(run, run);
  queue = result.catch(() => {});
  return result;
}

// ponytail: send-and-wait streaming (~10-20 lines/s); Marlin buffers moves anyway, pipeline 2-3 lines if too slow
export async function streamGcode(
  gcode: string,
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal,
) {
  const lines = gcode
    .split("\n")
    .map((l) => l.replace(/;.*$/, "").replace(/\(.*?\)/g, "").trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (signal.aborted) throw new Error("To'xtatildi");
    const reply = await sendLine(lines[i]);
    if (!reply.startsWith("ok")) throw new Error(`${i + 1}-qator "${lines[i]}" → ${reply}`);
    onProgress(i + 1, lines.length);
  }
}

/** Hardware reset via DTR: the only instant stop on Marlin 1.0.2. Board reboots (~2s), position is lost. */
export const stop = () => api("reset");
