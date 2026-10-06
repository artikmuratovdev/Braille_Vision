"""Send a G-code file to the printer through the running bridge (server/bridge.py).

  python server/run_gcode.py printer_tests/00_info.gcode
  python server/run_gcode.py printer_tests/03_scale_square.gcode --depth 0.4

Placeholders in test files: {REST} = Z rest height, {PUNCH} = REST - depth,
{REST-0.2} / {REST+0.2} = fixed offsets. Ctrl+C = emergency stop (hardware reset).
Uses only the standard library; the bridge must be running (npm start / npm run bridge).
"""

import argparse
import json
import queue
import re
import sys
import threading
import time
import urllib.error
import urllib.request

BRIDGE = "http://127.0.0.1:3001"  # not "localhost": avoids a ~2 s IPv6 fallback on Windows
REPLY = re.compile(r"^(ok|Error|start)|ok$")
PLACEHOLDER = re.compile(r"\{(REST|PUNCH)([+-]\d+(?:\.\d+)?)?\}")


def request(path: str, data: dict | None = None):
    req = urllib.request.Request(BRIDGE + path)
    if data is not None:
        req = urllib.request.Request(
            BRIDGE + path, json.dumps(data).encode(), {"Content-Type": "application/json"}, method="POST"
        )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Bridge xatosi: {json.load(e).get('error', e)}")
    except urllib.error.URLError:
        raise SystemExit("Bridge ishlamayapti - avval boshqa terminalda: npm start")


def listen(q: queue.Queue) -> None:
    try:
        with urllib.request.urlopen(BRIDGE + "/api/events") as r:
            for raw in r:
                line = raw.decode("utf-8", "replace").strip()
                if line.startswith("data: "):
                    q.put(json.loads(line[6:]))
    except OSError:
        pass  # bridge down: the main thread's next request() reports it


def load(path: str, depth: float, rest: float) -> tuple[list[str], list[str]]:
    """Return (description comments, commands) with placeholders filled in."""
    def fill(m: re.Match) -> str:
        base = rest - depth if m.group(1) == "PUNCH" else rest
        return f"{base + float(m.group(2) or 0):.2f}"

    notes, cmds = [], []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.lstrip().startswith(";"):
                notes.append(line.strip())
            elif cmd := re.sub(r";.*$", "", line).strip():
                cmds.append(PLACEHOLDER.sub(fill, cmd))
    return notes, cmds


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="G-code faylni printerga yuborish (bridge orqali)")
    ap.add_argument("file")
    ap.add_argument("--depth", type=float, default=0.5, help="bosish chuqurligi, mm (manfiy = +Z tomonga)")
    ap.add_argument("--rest", type=float, default=5.0, help="Z 'tepa' balandligi, mm (depth dan katta)")
    ap.add_argument("-y", "--yes", action="store_true", help="tasdiq so'ramasdan boshlash")
    args = ap.parse_args()

    if args.rest - args.depth < 0:
        raise SystemExit("--rest --depth dan katta bo'lishi kerak (Marlin Z ni 0 dan pastga tushirmaydi)")
    notes, cmds = load(args.file, args.depth, args.rest)
    print("\n".join(notes))
    print(f"\n{len(cmds)} ta buyruq | depth={args.depth} mm, rest={args.rest} mm")

    q: queue.Queue = queue.Queue()
    threading.Thread(target=listen, args=(q,), daemon=True).start()
    time.sleep(0.3)
    if not request("/api/status")["connected"]:
        print("COM3 ga ulanmoqda (Arduino qayta yuklanadi)...")
        request("/api/connect", {})

    if not args.yes:
        input("Bosh TEPADA va qog'oz joyida bo'lsa - Enter (bekor qilish: Ctrl+C) ")

    t0 = time.time()
    try:
        for i, cmd in enumerate(cmds, 1):
            while not q.empty():  # anything that arrived earlier is not our reply
                print(f"        {q.get_nowait()}")
            print(f"[{i}/{len(cmds)}] > {cmd}")
            sent = time.time()
            request("/api/write", {"data": cmd + "\n"})
            deadline = sent + (60 if cmd.startswith("M400") else 20)
            while True:
                try:
                    reply = q.get(timeout=max(0.0, deadline - time.time()))
                except queue.Empty:
                    raise SystemExit(f"TIMEOUT: '{cmd}' ga javob kelmadi")
                print(f"        < {reply}   (+{(time.time() - sent) * 1000:.0f} ms, t={time.time() - t0:.1f} s)")
                if REPLY.search(reply):
                    break
            if not (reply.startswith("ok") or reply.endswith("ok")):
                raise SystemExit(f"XATO: {cmd} -> {reply}")
        print(f"\n✓ Test tugadi ({time.time() - t0:.1f} s)")
    except KeyboardInterrupt:
        request("/api/reset", {})
        raise SystemExit("\n■ To'xtatildi (Arduino reset). Ilovada: Uzish -> Ulash.")


if __name__ == "__main__":
    main()
