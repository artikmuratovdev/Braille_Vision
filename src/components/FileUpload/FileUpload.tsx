import React, { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { resizeImage } from '../../utils/imageUtils';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  onUpload: (data: { base64: string; mimeType: string; previewUrl: string }) => void;
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string; size: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    try {
      const { base64, mimeType, previewUrl } = await resizeImage(file, 1600);
      setError(null);
      setPreview({ url: previewUrl, name: file.name, size: `${(file.size / 1024).toFixed(0)} KB` });
      onUpload({ base64, mimeType, previewUrl });
    } catch (err) {
      console.error(err);
      setError('Could not read this image.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const handleRemove = () => {
    setPreview(null);
    onUpload({ base64: '', mimeType: '', previewUrl: '' });
    if (inputRef.current) inputRef.current.value = '';
  };

  if (preview) {
    return (
      <div className={styles.preview}>
        <img src={preview.url} alt="Selected page" />
        <div className={styles.info}>
          <span className={styles.name}>{preview.name}</span>
          <span className={styles.size}>{preview.size}</span>
          <button className={styles.remove} onClick={handleRemove} aria-label="Remove image">
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <label
      className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* On phones this input offers both the camera and the gallery. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.input}
        onChange={(e) => processFile(e.target.files?.[0])}
      />
      <span className={styles.icon}>
        <ImagePlus size={28} />
      </span>
      <span className={styles.primary}>
        <span className={styles.touchOnly}>Take a photo or choose from gallery</span>
        <span className={styles.pointerOnly}>Drop an image here or click to browse</span>
      </span>
      <span className={styles.secondary}>A clear, well-lit page works best</span>
      {error && <span className={styles.error}>{error}</span>}
    </label>
  );
}
