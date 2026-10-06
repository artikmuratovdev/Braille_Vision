"""Braille Vision USB bridge: browser <-> HTTP <-> Arduino (Marlin) on a fixed COM port.

Setup once:  python -m pip install -r server/requirements.txt
Run:         npm start            (builds the app, then http://localhost:3001)
Dev:         npm run bridge  +  npm run dev   (Vite proxies /api to this bridge)

API (same as the web app expects):
  GET  /api/events      Server-Sent Events, one message per line received from the printer
  GET  /api/status      {"port": "COM3", "connected": bool}
  POST /api/connect     open the port (board resets, ~2.5 s boot)
  POST /api/disconnect  close the port
  POST /api/write       {"data": "G0 X10\n"} raw text to the printer
  POST /api/reset       pulse DTR = hardware reset (emergency stop on Marlin 1.0.2)
"""

import json
import os
import queue
import socket
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import serial

COM_PORT = os.environ.get("SERIAL_PORT", "COM3")
BAUD = 115200
HTTP_PORT = int(os.environ.get("BRIDGE_PORT", "3001"))
DIST = Path(__file__).resolve().parent.parent / "dist"

port: serial.Serial | None = None
port_lock = threading.Lock()
clients: set[queue.Queue] = set()
clients_lock = threading.Lock()


def broadcast(line: str) -> None:
    if not line:
        return
    with clients_lock:
        for q in clients:
            q.put(line)


def read_loop(p: serial.Serial) -> None:
    """Split incoming bytes into lines and push them to every browser."""
    buf = b""
    while True:
        try:
            data = p.read(p.in_waiting or 1)  # returns b"" after the 0.1 s timeout
        except (serial.SerialException, OSError, TypeError, AttributeError):
            break  # closed by us or unplugged
        buf += data
        while b"\n" in buf:
            raw, buf = buf.split(b"\n", 1)
            broadcast(raw.decode("utf-8", "replace").strip())
    broadcast(f"[bridge] {COM_PORT} yopildi")


def friendly(e: Exception) -> str:
    msg = str(e)
    if "PermissionError" in msg or "Access is denied" in msg:
        return f"{COM_PORT} band — boshqa dastur ishlatyapti. Uni yoping yoki USB'ni uzib-ulang."
    if "FileNotFoundError" in msg or "could not open port" in msg:
        return f"{COM_PORT} topilmadi — Arduino ulanganmi? (Device Manager → Ports)"
    return f"{COM_PORT}: {msg}"


def connect() -> None:
    global port
    with port_lock:
        if port and port.is_open:
            return
        p = serial.Serial(COM_PORT, BAUD, timeout=0.1)  # opening asserts DTR → board resets
        port = p
    threading.Thread(target=read_loop, args=(p,), daemon=True).start()
    time.sleep(2.5)  # Marlin boots in ~2 s


def disconnect() -> None:
    global port
    with port_lock:
        p, port = port, None
    if p and p.is_open:
        p.close()


def require_port() -> serial.Serial:
    p = port
    if not (p and p.is_open):
        raise ConnectionError(f"{COM_PORT} ulanmagan")
    return p


def reset() -> None:
    p = require_port()
    p.dtr = p.rts = False
    time.sleep(0.1)
    p.dtr = p.rts = True


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def log_message(self, *args):  # keep the console for printer traffic only
        pass

    def send_json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/status":
            return self.send_json(200, {"port": COM_PORT, "connected": bool(port and port.is_open)})
        if self.path == "/api/events":
            return self.stream_events()
        if not DIST.exists():
            return self.send_json(404, {"error": "dist/ yo'q — avval: npm run build (yoki npm start)"})
        return super().do_GET()

    def stream_events(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        q: queue.Queue = queue.Queue()
        with clients_lock:
            clients.add(q)
        try:
            while True:
                try:
                    msg = f"data: {json.dumps(q.get(timeout=15))}\n\n"
                except queue.Empty:
                    msg = ": ping\n\n"  # keep-alive; also detects a closed tab
                self.wfile.write(msg.encode())
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass
        finally:
            with clients_lock:
                clients.discard(q)

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return self.send_json(400, {"error": "JSON xato"})
        try:
            if self.path == "/api/connect":
                connect()
            elif self.path == "/api/disconnect":
                disconnect()
            elif self.path == "/api/write":
                require_port().write(str(body.get("data", "")).encode())
            elif self.path == "/api/reset":
                reset()
            else:
                return self.send_json(404, {"error": "noma'lum manzil"})
            self.send_json(200, {"ok": True})
        except ConnectionError as e:
            self.send_json(409, {"error": str(e)})
        except (serial.SerialException, OSError) as e:
            self.send_json(500, {"error": friendly(e)})


class Server(ThreadingHTTPServer):
    allow_reuse_address = False  # on Windows SO_REUSEADDR would let two bridges share the port
    # Listen on IPv6 + IPv4: Windows resolves "localhost" to ::1 first, and an IPv4-only
    # server makes every request wait ~2 s for that attempt to fail.
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


def main() -> None:
    try:
        server = Server(("::", HTTP_PORT), Handler)
    except OSError:
        raise SystemExit(
            f"Port {HTTP_PORT} band - bridge allaqachon ishlayapti. http://localhost:{HTTP_PORT} ni oching "
            f"yoki boshqa terminaldagi bridge'ni yoping (Ctrl+C)."
        )
    print(f"Braille Vision bridge: http://localhost:{HTTP_PORT}  ({COM_PORT} @ {BAUD})  - to'xtatish: Ctrl+C", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        disconnect()


if __name__ == "__main__":
    main()
