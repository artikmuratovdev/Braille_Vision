import { useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Play, Plug, Printer, Square, Unplug } from 'lucide-react';
import * as serial from '../../utils/serial';
import { GcodeSettings, punchGcode, zRestGcode } from '../../utils/gcode';
import ui from '../ui.module.css';
import styles from './PrinterControl.module.css';

interface PrinterControlProps {
  gcode: string;
  settings: GcodeSettings;
}

export default function PrinterControl({ gcode, settings }: PrinterControlProps) {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [cmd, setCmd] = useState('');
  const [step, setStep] = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const addLog = (line: string) => setLog((prev) => [...prev.slice(-199), line]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      addLog(`⚠ ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const sendAll = async (lines: string[]) => {
    for (const line of lines) {
      const reply = await serial.sendLine(line);
      if (!reply.startsWith('ok')) throw new Error(`${line} → ${reply}`);
    }
  };

  const toggleConnect = () =>
    run(async () => {
      if (connected) {
        await serial.disconnect();
        setConnected(false);
        addLog('Disconnected');
      } else {
        await serial.connect(addLog);
        setConnected(true);
        // Marlin boots at 0,0,0 and its software endstops block moves below 0, so X−/Y− jog
        // would do nothing. Pretend we're mid-bed until the user sets the paper zero.
        await sendAll(['G92 X100 Y100', zRestGcode(settings)]);
      }
    });

  const print = () =>
    run(async () => {
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        await serial.streamGcode(gcode, (done, total) => setProgress([done, total]), ac.signal);
        addLog('✓ Print finished');
      } finally {
        abortRef.current = null;
        setProgress(null);
      }
    });

  const stopAll = async () => {
    abortRef.current?.abort();
    try {
      await serial.stop();
      addLog('■ Stopped (Arduino reset). Disconnect → Connect, then set the zero point again.');
    } catch (e: any) {
      addLog(`⚠ ${e.message}`);
    }
  };

  const jog = (dx: number, dy: number) =>
    run(() => sendAll(['G91', `G0 X${dx} Y${dy} F${settings.feedRate}`, 'G90']));

  const sendConsole = () => {
    const line = cmd.trim();
    if (!line) return;
    setCmd('');
    run(() => serial.sendLine(line));
  };

  const idle = connected && !busy;
  const percent = progress ? Math.round((progress[0] / progress[1]) * 100) : 0;

  return (
    <div className={ui.card}>
      <div className={ui.cardHeader}>
        <span className={ui.title}>
          <Printer size={18} className={ui.titleIcon} /> Printer
        </span>
        <span className={`${styles.status} ${connected ? styles.online : ''}`}>
          <span className={styles.statusDot} /> {connected ? 'Connected' : 'Offline'}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.mainRow}>
          <button className={ui.btn} onClick={toggleConnect} disabled={busy && !progress}>
            {connected ? <Unplug size={16} /> : <Plug size={16} />}
            {connected ? 'Disconnect' : 'Connect'}
          </button>
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={print} disabled={!idle || !gcode}>
            <Play size={16} /> Print
          </button>
          <button className={`${ui.btn} ${styles.stop}`} onClick={stopAll} disabled={!connected}>
            <Square size={16} /> Stop
          </button>
        </div>

        {!gcode && <p className={styles.hint}>Convert a photo first — the G-code will be sent from here.</p>}

        {progress && (
          <div className={styles.progress} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles.track}>
              <div className={styles.bar} style={{ width: `${percent}%` }} />
            </div>
            <span className={ui.meta}>
              {progress[0]} / {progress[1]} lines · {percent}%
            </span>
          </div>
        )}

        <details className={styles.section}>
          <summary>Manual control</summary>
          <div className={styles.manual}>
            <div className={styles.jog}>
              <button className={ui.btn} style={{ gridArea: 'up' }} onClick={() => jog(0, step)} disabled={!idle} aria-label="Y+">
                <ArrowUp size={18} />
              </button>
              <button className={ui.btn} style={{ gridArea: 'left' }} onClick={() => jog(-step, 0)} disabled={!idle} aria-label="X−">
                <ArrowLeft size={18} />
              </button>
              <select
                className={styles.select}
                style={{ gridArea: 'step' }}
                value={step}
                onChange={(e) => setStep(Number(e.target.value))}
                aria-label="Jog step"
              >
                <option value={1}>1 mm</option>
                <option value={10}>10 mm</option>
                <option value={50}>50 mm</option>
              </select>
              <button className={ui.btn} style={{ gridArea: 'right' }} onClick={() => jog(step, 0)} disabled={!idle} aria-label="X+">
                <ArrowRight size={18} />
              </button>
              <button className={ui.btn} style={{ gridArea: 'down' }} onClick={() => jog(0, -step)} disabled={!idle} aria-label="Y−">
                <ArrowDown size={18} />
              </button>
            </div>

            <div className={styles.tools}>
              <button className={ui.btn} onClick={() => run(() => sendAll(['G92 X0 Y0', zRestGcode(settings)]))} disabled={!idle}>
                <Crosshair size={16} /> Set zero here
              </button>
              <button
                className={ui.btn}
                onClick={() => run(() => sendAll([zRestGcode(settings), ...punchGcode(settings).trim().split('\n')]))}
                disabled={!idle}
              >
                Test dot
              </button>
              <button className={ui.btn} onClick={() => run(() => sendAll(['M114']))} disabled={!idle}>
                Position
              </button>
              <button className={ui.btn} onClick={() => run(() => sendAll(['M503']))} disabled={!idle}>
                Firmware settings
              </button>
            </div>
          </div>
        </details>

        <details className={styles.section}>
          <summary>Console {log.length > 0 && <span className={ui.meta}>· {log.length}</span>}</summary>
          <pre className={styles.log}>{[...log].reverse().join('\n') || 'Empty'}</pre>
          <form
            className={styles.consoleRow}
            onSubmit={(e) => {
              e.preventDefault();
              sendConsole();
            }}
          >
            <input
              className={styles.input}
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="G0 X10, M114 ..."
              autoCapitalize="characters"
              autoCorrect="off"
              disabled={!connected}
              aria-label="G-code command"
            />
            <button className={ui.btn} disabled={!connected}>
              Send
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
