import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, X } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [hasDetector, setHasDetector] = useState(false);

  const stopStream = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    setError(null);
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for native BarcodeDetector
      if ('BarcodeDetector' in window) {
        setHasDetector(true);
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              stopStream();
              setScanning(false);
              onScan(code);
            }
          } catch {
            // Detection frame error — ignore and retry
          }
        }, 250);
      } else {
        // Fallback: canvas-based frame capture with manual entry prompt
        setHasDetector(false);
        setError('Your browser does not support barcode scanning. Please type the barcode manually.');
        stopStream();
        setScanning(false);
      }
    } catch (err) {
      setScanning(false);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Could not access camera. Please type the barcode manually.');
      }
    }
  }, [onScan, stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  return (
    <div className="space-y-3">
      {!scanning && !error && (
        <button
          onClick={startScanning}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-cream-dark text-warm-gray hover:border-terracotta hover:text-terracotta transition-colors duration-200 min-h-[44px]"
        >
          <Camera size={18} />
          <span className="font-medium">Scan with Camera</span>
        </button>
      )}

      {scanning && (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            playsInline
            muted
          />
          {/* Scan overlay guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-16 border-2 border-white/60 rounded-lg" />
          </div>
          <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80">
            Point camera at barcode
          </p>
          <button
            onClick={() => { stopStream(); setScanning(false); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Stop scanning"
          >
            <X size={16} />
          </button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-cream text-sm">
          <CameraOff size={16} className="text-warm-gray shrink-0 mt-0.5" />
          <div>
            <p className="text-brown-light">{error}</p>
            <button
              onClick={() => { setError(null); startScanning(); }}
              className="text-terracotta hover:underline text-xs mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
