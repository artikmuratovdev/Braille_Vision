import { useEffect, useRef, useState } from 'react';
import styles from './CameraCapture.module.css';

interface CameraCaptureProps {
  onCapture: (data: { base64: string, mimeType: string, previewUrl: string }) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setError('Could not access camera. Please allow camera permissions.');
      }
    }

    if (!capturedUrl) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [capturedUrl]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const mimeType = 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, 0.88);
    const base64 = dataUrl.split(',')[1];
    
    setCapturedUrl(dataUrl);
    onCapture({ base64, mimeType, previewUrl: dataUrl });
  };

  const handleRetake = () => {
    setCapturedUrl(null);
    onCapture({ base64: '', mimeType: '', previewUrl: '' });
  };

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      {capturedUrl ? (
        <div className={styles.previewContainer}>
          <img src={capturedUrl} alt="Captured" className={styles.preview} />
          <button className={styles.retakeBtn} onClick={handleRetake}>Retake</button>
        </div>
      ) : (
        <div className={styles.videoContainer}>
          <video ref={videoRef} autoPlay playsInline className={styles.video} />
          <button className={styles.captureBtn} onClick={handleCapture}>Capture</button>
        </div>
      )}
    </div>
  );
}
