import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LiveWebcamScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeDetected: (code: string) => void;
}

export const LiveWebcamScanner: React.FC<LiveWebcamScannerProps> = ({
  isOpen,
  onClose,
  onCodeDetected
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedData, setDetectedData] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setDetectedData(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported or not allowed in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(err.message || 'Unable to access camera. Check device permissions.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code && code.data && code.data.trim()) {
      const data = code.data.trim();
      setDetectedData(data);
      stopCamera();
      
      // Short delay to show detected feedback then emit
      setTimeout(() => {
        onCodeDetected(data);
        onClose();
      }, 500);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#080A10] border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold">
              <Camera className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live Camera QR Scanner</h3>
              <p className="text-[11px] text-slate-400">Point lens at any physical or on-screen QR code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <div className="text-xs text-rose-300 font-medium">{cameraError}</div>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Ensure your device has an active camera and browser permissions are granted. You can also upload any QR image file directly.
              </p>
              <button
                onClick={startCamera}
                className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-slate-200"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Target Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-white/40 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Corner Accent Brackets */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-white" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-white" />

                  {/* Pulsing Scan Beam */}
                  {isScanning && !detectedData && (
                    <div className="absolute left-2 right-2 h-0.5 bg-sky-400 shadow-[0_0_8px_#38bdf8] animate-bounce" />
                  )}

                  {detectedData && (
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                      <div className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Decoded Successfully</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#05060A] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Real-time continuous matrix scanning (30 FPS)</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-md text-[11px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
