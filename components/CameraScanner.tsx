
import React, { useRef, useState, useEffect } from 'react';
import { extractTextFromImage } from '../services/gemini';

interface CameraScannerProps {
  onTextScanned: (text: string) => void;
  onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onTextScanned, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { setError("Kamera-Zugriff verweigert."); }
    };
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsScanning(true);
    setError(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
      try {
        const text = await extractTextFromImage(base64);
        if (text.trim()) { onTextScanned(text); onClose(); } 
        else { setError("Kein Text erkannt."); }
      } catch (err) { setError("Scan fehlgeschlagen."); } 
      finally { setIsScanning(false); }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn font-mono">
      {/* Scanner Frame */}
      <div className="relative w-full max-w-lg aspect-[3/4] rounded-sm overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale opacity-80" />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* HUD Overlay */}
        <div className="absolute inset-0 border-[1px] border-white/20 m-4 rounded-sm">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-500"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-500"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500"></div>
          
          {/* Laser Grid Animation */}
          {isScanning && (
            <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center overflow-hidden">
               <div className="w-full h-[2px] bg-indigo-400 shadow-[0_0_20px_#6366f1] absolute top-0 animate-scanDown"></div>
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
            <span className="bg-black/60 text-indigo-400 text-xs px-3 py-1 border border-indigo-500/30 tracking-widest uppercase">
              {isScanning ? "PROCESSING_IMAGE_DATA..." : "VISION_MODULE_READY"}
            </span>
        </div>
      </div>

      <div className="mt-8 flex gap-6">
        <button onClick={onClose} className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center text-slate-400 hover:bg-white/10 transition-all">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <button onClick={captureAndScan} disabled={isScanning} className="w-20 h-20 rounded-full border border-indigo-500 flex items-center justify-center relative group">
           <div className={`absolute inset-0 bg-indigo-500/20 rounded-full blur-md transition-all ${isScanning ? 'animate-ping' : 'group-hover:bg-indigo-500/40'}`}></div>
           <div className="relative w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
             <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" style={{display: isScanning ? 'block' : 'none'}}></div>
             <div className="w-6 h-6 bg-white rounded-sm" style={{display: isScanning ? 'none' : 'block'}}></div>
           </div>
        </button>
      </div>
      
      {error && <div className="mt-6 text-red-400 text-xs tracking-widest uppercase animate-pulse">{error}</div>}
      
      <style>{`
        @keyframes scanDown {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scanDown { animation: scanDown 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};
