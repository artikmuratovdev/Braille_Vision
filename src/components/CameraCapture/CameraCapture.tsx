import { useEffect, useRef, useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import styles from './CameraCapture.module.css';

interface CameraCaptureProps {
  onCapture: (data: { base64: string; mimeType: string; previewUrl: string }) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (capturedUrl) return;
    // Browsers only expose the camera on HTTPS or localhost.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Live camera needs HTTPS. Start the app with "npm run phone", or use Upload.');
      return;
    }

    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError('Could not access the camera. Allow camera permission, or use Upload.'));

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [capturedUrl]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedUrl(dataUrl);
    onCapture({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', previewUrl: dataUrl });
  };

  const handleRetake = () => {
    setCapturedUrl(null);
    onCapture({ base64: '', mimeType: '', previewUrl: '' });
  };

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <TriangleAlert size={28} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.frame}>
      {capturedUrl ? (
        <>
          <img src={capturedUrl} alt="Captured page" className={styles.media} />
          <button className={styles.retake} onClick={handleRetake}>
            <RefreshCw size={16} /> Retake
          </button>
        </>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className={styles.media} />
          <div className={styles.guide} aria-hidden="true" />
          <button className={styles.shutter} onClick={handleCapture} aria-label="Take photo" />
        </>
      )}
    </div>
  );
}
