// ============================================================
// BarcodeScanner Component - Camera-based barcode scanner
// Menggunakan html5-qrcode untuk akses kamera & scan barcode
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera, CameraOff, SwitchCamera, Flashlight, X, Scan } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
}

const SCANNER_ID = 'html5-qrcode-scanner';

export default function BarcodeScanner({ onScan, onClose, title = 'Scan Barcode', hint }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCamIdx, setCurrentCamIdx] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const cooldownRef = useRef(false);

  // Initialize scanner
  const startScanner = useCallback(async (cameraId: string) => {
    if (!scannerRef.current) return;
    try {
      if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        await scannerRef.current.stop();
      }
      await scannerRef.current.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 260, height: 130 },
          aspectRatio: 1.7,
          disableFlip: false,
        },
        (decodedText) => {
          if (cooldownRef.current) return;
          cooldownRef.current = true;
          setLastScanned(decodedText);
          onScan(decodedText);
          // Cooldown 1.5s to prevent duplicate scans
          setTimeout(() => { cooldownRef.current = false; }, 1500);
        },
        () => {} // error per frame — ignore
      );
      setIsRunning(true);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('permission')) {
        setError('Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser Anda.');
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFound')) {
        setError('Kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera.');
      } else {
        setError('Gagal membuka kamera: ' + msg);
      }
      setIsRunning(false);
    }
  }, [onScan]);

  // Mount: get camera list, pick back camera by default
  useEffect(() => {
    scannerRef.current = new Html5Qrcode(SCANNER_ID, { verbose: false });

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!devices || devices.length === 0) {
          setError('Tidak ada kamera yang terdeteksi di perangkat ini.');
          return;
        }
        setCameras(devices);
        // Prefer back/environment camera
        const backIdx = devices.findIndex(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('belakang') ||
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('rear')
        );
        const idx = backIdx >= 0 ? backIdx : 0;
        setCurrentCamIdx(idx);
        startScanner(devices[idx].id);
      })
      .catch(() => {
        setError('Tidak dapat mengakses kamera. Pastikan Anda memberikan izin kamera.');
      });

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {/* ignore */}
      }
    };
  }, []); // eslint-disable-line

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (cameras.length < 2) return;
    const nextIdx = (currentCamIdx + 1) % cameras.length;
    setCurrentCamIdx(nextIdx);
    setTorchOn(false);
    await startScanner(cameras[nextIdx].id);
  }, [cameras, currentCamIdx, startScanner]);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !isRunning) return;
    try {
      const track = (scannerRef.current as unknown as { mediaStream?: MediaStream })
        .mediaStream?.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
        setTorchOn(prev => !prev);
      }
    } catch {
      // Torch not supported on this device
    }
  }, [isRunning, torchOn]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-indigo-400" />
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
        {error ? (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-900/50 flex items-center justify-center mx-auto mb-4">
              <CameraOff className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-red-400 text-sm font-medium mb-2">Kamera Tidak Tersedia</p>
            <p className="text-slate-400 text-xs leading-relaxed">{error}</p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Tutup
            </button>
          </div>
        ) : (
          <>
            {/* Scanner frame */}
            <div className="relative w-full max-w-sm">
              {/* Overlay frame corners */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-indigo-400 rounded-tl-lg" style={{ borderWidth: '3px' }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-indigo-400 rounded-tr-lg" style={{ borderWidth: '3px' }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-indigo-400 rounded-bl-lg" style={{ borderWidth: '3px' }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-indigo-400 rounded-br-lg" style={{ borderWidth: '3px' }} />
              </div>
              {/* Scanner element */}
              <div
                id={SCANNER_ID}
                className="w-full rounded-2xl overflow-hidden"
                style={{ minHeight: '220px' }}
              />
            </div>

            {/* Hint text */}
            <p className="text-slate-400 text-xs text-center max-w-xs">
              {hint || 'Arahkan kamera ke barcode produk. Pastikan barcode berada di tengah area scan.'}
            </p>

            {/* Last scanned result */}
            {lastScanned && (
              <div className="flex items-center gap-2 bg-emerald-900/50 border border-emerald-700/50 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 text-xs font-mono">{lastScanned}</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-3">
              {cameras.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition text-sm"
                >
                  <SwitchCamera className="h-4 w-4" />
                  Ganti Kamera
                </button>
              )}
              <button
                onClick={toggleTorch}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition text-sm ${
                  torchOn
                    ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-300'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white'
                }`}
              >
                <Flashlight className="h-4 w-4" />
                Flash
              </button>
            </div>

            {/* Camera label */}
            {cameras.length > 0 && (
              <p className="text-slate-600 text-[11px]">
                {cameras[currentCamIdx]?.label || `Kamera ${currentCamIdx + 1}`}
              </p>
            )}
          </>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="px-4 py-3 bg-slate-800/80 border-t border-slate-700 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-slate-400 text-xs">{isRunning ? 'Kamera aktif — scanning...' : 'Menginisialisasi...'}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs transition">
          Batal
        </button>
      </div>
    </div>
  );
}
