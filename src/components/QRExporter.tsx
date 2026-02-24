import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateChunks } from '../hooks/useQRSync';

export const QRExporter = ({ data, onCancel }: { data: string, onCancel: () => void }) => {
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setChunks(generateChunks(data));
  }, [data]);

  useEffect(() => {
    if (chunks.length === 0) return;
    
    // Animate QR code frames (1200ms per frame - safer, slower for cameras)
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % chunks.length);
    }, 1200); 

    return () => clearInterval(interval);
  }, [chunks]);

  if (chunks.length === 0) return (
    <div className="flex flex-col items-center justify-center p-8 bg-[var(--color-cloud-dancer)] rounded-3xl border border-black/5 shadow-inner min-h-[400px]">
       <div className="w-10 h-10 border-4 border-[var(--color-sage-green)] border-t-transparent rounded-full animate-spin"></div>
       <p className="mt-4 text-sm font-semibold opacity-60">QR Verisi Hazırlanıyor...</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-8 bg-gradient-to-br from-white to-[var(--color-cloud-dancer)] rounded-3xl border border-black/5 shadow-inner">
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold text-[var(--color-deep-navy)] tracking-tight">P2P Animasyonlu Aktarım</h3>
        <p className="text-sm opacity-60 mt-1 max-w-xs">Diğer cihaz tüm parçaları okuyana kadar bu QR kodlar sürekli değişecektir. Karşı cihaz okumayı bitirdiğinde kapatabilirsiniz.</p>
      </div>
      
      <div className="p-4 bg-white rounded-3xl shadow-md border border-[var(--color-sage-green)]/20 relative">
        <div className="absolute -inset-2 rounded-full blur-2xl bg-[var(--color-sage-green)]/10 -z-10 animate-pulse"></div>
        <QRCodeSVG 
            value={chunks[currentIndex]} 
            size={240} 
            level="L" 
            includeMargin={true} 
            className="rounded-xl"
        />
      </div>
      
      <div className="flex items-center gap-3 mt-4 text-sm font-[var(--font-geist-mono)]">
        <div className="w-48 h-2 bg-black/5 rounded-full overflow-hidden">
             <div className="h-full bg-[var(--color-sage-green)] transition-all duration-300" style={{ width: `${((currentIndex + 1) / chunks.length) * 100}%` }}></div>
        </div>
        <span className="opacity-60 font-bold w-12 text-right">{currentIndex + 1}/{chunks.length}</span>
      </div>

      <button onClick={onCancel} className="mt-6 px-8 py-2.5 rounded-xl border border-red-500/20 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all text-sm font-semibold active:scale-95 shadow-sm">
        Karşı Cihaz Okudu / Kapat
      </button>
    </div>
  );
};
