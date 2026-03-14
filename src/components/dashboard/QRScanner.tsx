import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

/**
 * QRScanner — Kamera ile QR kod tarayıcı bileşeni.
 * TOTP otpauth:// URI'lerini tarayarak otomatik TOTP ekleme sağlar.
 */
export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const scanFrameRef = useRef<() => void>(() => {});

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(() => scanFrameRef.current());
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      stopCamera();
      onScan(code.data);
      return;
    }

    animFrameRef.current = requestAnimationFrame(() => scanFrameRef.current());
  }, [onScan, stopCamera]);

  useEffect(() => {
    scanFrameRef.current = scanFrame;
  }, [scanFrame]);

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        // Tarama döngüsünü başlat
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: unknown) {
      setIsScanning(false);
      const errorName = err instanceof Error ? err.name : "";
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      if (errorName === "NotAllowedError") {
        setError(t("cameraPermissionDenied", "Camera permission denied. Please allow camera access."));
      } else if (errorName === "NotFoundError") {
        setError(t("noCameraFound", "No camera found on this device."));
      } else {
        setError(t("cameraError", "Camera error: ") + errorMessage);
      }
    }
  }, [scanFrame, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startCamera();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-4 bg-[var(--color-cloud-dancer)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-deep-navy)] text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="text-sm font-bold">{t("scanQRCode", "Scan QR Code")}</span>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={t("close", "Close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative aspect-square bg-black overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            aria-label={t("cameraFeed", "Camera feed for QR scanning")}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scan Overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner brackets */}
              <div className="relative w-56 h-56">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-3 border-l-3 border-[var(--color-sage-green)] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-3 border-r-3 border-[var(--color-sage-green)] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-3 border-l-3 border-[var(--color-sage-green)] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-3 border-r-3 border-[var(--color-sage-green)] rounded-br-lg" />
                {/* Scanning line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-sage-green)] to-transparent animate-[scan_2s_linear_infinite]" 
                  style={{ animation: "scan 2s linear infinite" }} />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center px-6">
                <Camera className="w-12 h-12 text-red-400 mx-auto mb-3 opacity-60" />
                <p className="text-white text-sm mb-4">{error}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-[var(--color-sage-green)] text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  {t("tryAgain", "Try Again")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 text-center">
          <p className="text-[11px] text-[var(--color-deep-navy)]/50">
            {t("qrScanHint", "Point your camera at a TOTP QR code to scan it automatically")}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 8px; }
          50% { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
      `}</style>
    </div>
  );
}
