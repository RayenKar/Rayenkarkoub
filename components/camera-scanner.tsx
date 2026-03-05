"use client"

import React, { useRef, useState, useEffect } from "react"
import { X, Loader2, ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"

interface CameraScannerProps {
  onTextScanned: (text: string) => void
  onClose: () => void
}

export function CameraScanner({ onTextScanned, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        setError("Kamera-Zugriff verweigert.")
      }
    }
    startCamera()
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setIsScanning(true)
    setError(null)

    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      const base64 = canvas.toDataURL("image/jpeg").split(",")[1]
      try {
        const response = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)

        if (data.text?.trim()) {
          onTextScanned(data.text)
          onClose()
        } else {
          setError("Kein Text erkannt.")
        }
      } catch {
        setError("Scan fehlgeschlagen.")
      } finally {
        setIsScanning(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
      {/* Scanner Frame */}
      <div className="relative w-full max-w-md aspect-[3/4] rounded-xl overflow-hidden border border-border bg-card">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover opacity-90"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Corner Markers */}
        <div className="absolute inset-4 pointer-events-none">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />

          {/* Scan Line Animation */}
          {isScanning && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="w-full h-[2px] bg-primary shadow-[0_0_12px_rgba(59,130,246,0.8)] absolute top-0 animate-scan-line" />
            </div>
          )}
        </div>

        {/* Status */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="inline-flex items-center gap-1.5 bg-card/80 backdrop-blur-sm text-muted-foreground text-[10px] font-mono px-3 py-1.5 rounded-full border border-border tracking-widest uppercase">
            {isScanning ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                Processing...
              </>
            ) : (
              <>
                <ScanLine className="w-3 h-3" />
                Ready
              </>
            )}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <button
          onClick={captureAndScan}
          disabled={isScanning}
          className="relative group"
        >
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-md transition-all",
              isScanning
                ? "bg-primary/40 animate-pulse"
                : "bg-primary/20 group-hover:bg-primary/40"
            )}
          />
          <div className="relative w-16 h-16 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center transition-all group-active:scale-95">
            {isScanning ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-full" />
            )}
          </div>
        </button>
      </div>

      {error && (
        <p className="mt-4 text-destructive text-xs font-mono tracking-widest uppercase animate-pulse">
          {error}
        </p>
      )}
    </div>
  )
}
