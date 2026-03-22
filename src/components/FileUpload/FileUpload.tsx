import React, { useState, useRef } from 'react';
import { resizeImage } from '../../utils/imageUtils';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  onUpload: (data: { base64: string, mimeType: string, previewUrl: string }) => void;
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<{ url: string, name: string, size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    try {
      const { base64, mimeType, previewUrl } = await resizeImage(file, 1280);
      setPreview({
        url: previewUrl,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
      onUpload({ base64, mimeType, previewUrl });
    } catch (err) {
      console.error(err);
      alert('Error processing image.');
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUpload({ base64: '', mimeType: '', previewUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className={`${styles.container} ${isDragging ? styles.dragging : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !preview && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className={styles.hiddenInput} 
      />
      
      {preview ? (
        <div className={styles.previewContainer}>
          <img src={preview.url} alt="Preview" className={styles.preview} />
          <div className={styles.fileInfo}>
            <span>{preview.name} ({preview.size})</span>
            <button className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); handleRemove(); }}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.icon}>📁</div>
          <p>Click or drag image here to upload</p>
        </div>
      )}
    </div>
  );
}
