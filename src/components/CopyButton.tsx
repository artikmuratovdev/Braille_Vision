import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import ui from './ui.module.css';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API needs HTTPS or localhost; nothing useful to do otherwise.
    }
  };

  return (
    <button className={`${ui.btn} ${copied ? ui.copied : ''}`} onClick={handleCopy} aria-label="Copy">
      {copied ? <Check size={16} /> : <Copy size={16} />}
      <span className={ui.btnLabel}>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
