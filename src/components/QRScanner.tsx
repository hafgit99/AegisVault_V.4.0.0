import React, { useEffect, useState } from 'react';
import { useQRScanner } from '../hooks/useQRSync';
import { ProgressRing } from './ProgressRing';
import { Camera, CheckCircle2 } from 'lucide-react';

export const QRScanner = ({ onScanSuccess, onCancel }: { onScanSuccess: (data: string) => void, onCancel: () => void }) => {
  const { videoRef, startScanning, stopScanning, isScanning, progress, receivedChunks, totalChunks, error } = useQRScanner(onScanSuccess);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    startScanning();
    return () => stopScanning();
  }, []);

  useEffect(() => {
    if (progress === 100) {
        setCompleted(true);
    }
  }, [progress]);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-8 bg-gradient-to-br from-[var(--color-cloud-dancer)] to-white rounded-3xl border border-black/5 shadow-inner relative min-h-[400px]">
      <div className="text-center z-10">
        <h3 className="text-xl font-bold text-[var(--color-deep-navy)] tracking-tight">P2P Sync Receiver</h3>
        <p className="text-sm opacity-60 mt-1 max-w-sm">Kameranızı diğer cihazdaki aktarılan animasyonlu QR kod serisine odaklayın.</p>
      </div>

      {error ? (
        <div className="text-red-600 text-sm font-semibold bg-red-50 p-4 rounded-xl border border-red-500/20 z-10 text-center max-w-[250px]">
             {error}
             <p className="text-xs opacity-70 mt-2 font-normal">Please allow camera permissions and ensure a camera is connected.</p>
        </div>
      ) : completed ? (
         <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in slide-in-from-bottom-5 duration-500 z-10">
             <CheckCircle2 className="w-20 h-20 text-[var(--color-sage-green)] mb-6 drop-shadow-md" />
             <p className="font-bold text-2xl text-[var(--color-deep-navy)]">Transfer Complete!</p>
             <p className="text-sm opacity-60 mt-1">Processing and decrypting vault data...</p>
         </div>
      ) : (
        <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-[2rem] overflow-hidden border-8 border-white shadow-xl bg-black/5 flex items-center justify-center z-10 group">
            {!isScanning && <Camera className="w-10 h-10 opacity-20 animate-pulse" />}
            
            {/* Camera feed */}
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />
            
            {/* Scan Overlay / Guide */}
            <div className="absolute inset-0 border-2 border-[var(--color-sage-green)]/30 m-8 rounded-xl pointer-events-none transition-all duration-300 group-hover:scale-105 group-hover:border-[var(--color-sage-green)]/60">
                 {/* Corner markers */}
                 <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--color-sage-green)]"></div>
                 <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--color-sage-green)]"></div>
                 <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--color-sage-green)]"></div>
                 <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--color-sage-green)]"></div>
            </div>

            {/* Progress Overlay when scanning starts */}
            {totalChunks > 0 && (
                <div className="absolute inset-0 bg-[var(--color-deep-navy)]/60 flex flex-col items-center justify-center backdrop-blur-sm transition-all animate-in fade-in duration-300">
                   <div className="relative flex items-center justify-center">
                      <ProgressRing radius={50} stroke={8} progress={progress} />
                      <span className="absolute text-white font-bold text-2xl drop-shadow-sm">{progress}%</span>
                   </div>
                   <p className="text-white text-sm mt-4 font-semibold bg-black/40 px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
                       Parça {receivedChunks}/{totalChunks} Alınıyor...
                   </p>
                </div>
            )}
        </div>
      )}

      <button onClick={onCancel} className="mt-4 px-8 py-2.5 rounded-xl border border-black/10 text-[var(--color-deep-navy)] hover:bg-white transition-all text-sm font-semibold shadow-sm z-10 active:scale-95">
        İptal Et
      </button>
    </div>
  );
};
