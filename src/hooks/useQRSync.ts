import { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

// Format: aegis:session_id:current_index:total_chunks:data
const CHUNK_PREFIX = 'aegis:';
const CHUNK_SIZE = 150; // adjust based on QR density preference

export function generateChunks(data: string): string[] {
  const sessionId = Math.random().toString(36).substring(2, 8);
  const chunks: string[] = [];
  
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.substring(i, i + CHUNK_SIZE));
  }
  
  return chunks.map((chunk, idx) => 
    `${CHUNK_PREFIX}${sessionId}:${idx + 1}:${chunks.length}:${chunk}`
  );
}

export function useQRScanner(onComplete: (data: string) => void) {
  const [progress, setProgress] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [receivedChunks, setReceivedChunks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  
  // State for chunk collection
  const chunksMap = useRef<Map<number, string>>(new Map());
  const currentSessionId = useRef<string | null>(null);

  const startScanning = async () => {
    if (!videoRef.current) return;
    setError(null);
    setIsScanning(true);
    
    // Reset state
    chunksMap.current.clear();
    currentSessionId.current = null;
    setProgress(0);
    setReceivedChunks(0);
    setTotalChunks(0);

    const codeReader = new BrowserQRCodeReader();
    
    try {
      controlsRef.current = await codeReader.decodeFromVideoDevice(
        undefined, // automatically find back camera if possible
        videoRef.current,
        (result, error) => {
          if (result) {
            handleScanResult(result.getText());
          }
          if (error && error.name !== 'NotFoundException') {
             // Ignore not found, normal during continuous scanning
          }
        }
      );
    } catch (err: any) {
      setError("Kamera erişimi reddedildi veya bulunamadı.");
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanResult = (text: string) => {
    if (!text.startsWith(CHUNK_PREFIX)) return;
    
    const parts = text.split(':');
    if (parts.length < 5) return; // aegis:session_id:idx:total:data

    const [, sessionId, idxStr, totalStr, ...dataParts] = parts;
    const idx = parseInt(idxStr, 10);
    const total = parseInt(totalStr, 10);
    const data = dataParts.join(':'); // In case data contains ':'

    if (currentSessionId.current !== sessionId) {
      // New session detected, reset
      currentSessionId.current = sessionId;
      chunksMap.current.clear();
      setTotalChunks(total);
    }

    if (!chunksMap.current.has(idx)) {
      chunksMap.current.set(idx, data);
      const newReceivedCount = chunksMap.current.size;
      setReceivedChunks(newReceivedCount);
      setProgress(Math.round((newReceivedCount / total) * 100));

      if (newReceivedCount === total) {
        // Complete!
        stopScanning();
        
        // Reassemble
        const sortedChunks = [];
        for (let i = 1; i <= total; i++) {
          sortedChunks.push(chunksMap.current.get(i));
        }
        
        const fullData = sortedChunks.join('');
        onComplete(fullData);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanning(); // Cleanup on unmount
    };
  }, []);

  return {
    videoRef,
    startScanning,
    stopScanning,
    isScanning,
    progress,
    totalChunks,
    receivedChunks,
    error
  };
}
