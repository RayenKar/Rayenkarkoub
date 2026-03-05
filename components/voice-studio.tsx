"use client"

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react"
import {
  Play,
  Square,
  Download,
  Mic,
  MicOff,
  Camera,
  Languages,
  Repeat,
  Volume2,
  Gauge,
  Loader2,
  AlertCircle,
  X,
  AudioLines,
} from "lucide-react"
import { GERMAN_VOICES, type GermanVoice } from "@/lib/voices"
import {
  decodeBase64,
  encodeBase64,
  decodeAudioData,
  audioBufferToWav,
} from "@/lib/audio"
import { CameraScanner } from "@/components/camera-scanner"
import { VoiceSelector } from "@/components/voice-selector"
import { ControlKnob } from "@/components/control-knob"
import { cn } from "@/lib/utils"

interface WordTiming {
  word: string
  start: number
  end: number
}

export function VoiceStudio() {
  const [text, setText] = useState("")
  const [arabicText, setArabicText] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState(GERMAN_VOICES[0])
  const [isLoading, setIsLoading] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTestingVoice, setIsTestingVoice] = useState(false)
  const [isDictating, setIsDictating] = useState(false)
  const [isLoopEnabled, setIsLoopEnabled] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [downloadQuality, setDownloadQuality] = useState<number>(24000)

  // Audio Controls
  const [volume, setVolume] = useState(0.85)
  const [reverbLevel, setReverbLevel] = useState(0.0)
  const [delayLevel, setDelayLevel] = useState(0.0)
  const [speedKnobValue, setSpeedKnobValue] = useState(0.25)

  const playbackSpeed = useMemo(
    () => 0.5 + speedKnobValue * 2.0,
    [speedKnobValue]
  )

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const dictationAudioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const reverbGainRef = useRef<GainNode | null>(null)
  const delayGainRef = useRef<GainNode | null>(null)
  const impulseBufferRef = useRef<AudioBuffer | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const currentAudioBufferRef = useRef<AudioBuffer | null>(null)
  const startTimeRef = useRef<number>(0)
  const wordTimingsRef = useRef<WordTiming[]>([])
  const animationFrameRef = useRef<number>(0)
  const liveSessionRef = useRef<any>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null)
  const isLoopEnabledRef = useRef(isLoopEnabled)
  const isPlayingRef = useRef(isPlaying)
  const volumeRef = useRef(volume)
  const reverbLevelRef = useRef(reverbLevel)
  const delayLevelRef = useRef(delayLevel)
  const speedRef = useRef(playbackSpeed)

  useEffect(() => {
    isLoopEnabledRef.current = isLoopEnabled
  }, [isLoopEnabled])
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])
  useEffect(() => {
    volumeRef.current = volume
  }, [volume])
  useEffect(() => {
    reverbLevelRef.current = reverbLevel
  }, [reverbLevel])
  useEffect(() => {
    delayLevelRef.current = delayLevel
  }, [delayLevel])
  useEffect(() => {
    speedRef.current = playbackSpeed
  }, [playbackSpeed])

  // Realtime audio parameter updates
  useEffect(() => {
    const ctx = audioContextRef.current
    if (ctx && ctx.state === "running") {
      const now = ctx.currentTime
      if (gainNodeRef.current)
        gainNodeRef.current.gain.setTargetAtTime(volume, now, 0.05)
      if (reverbGainRef.current)
        reverbGainRef.current.gain.setTargetAtTime(reverbLevel, now, 0.05)
      if (delayGainRef.current)
        delayGainRef.current.gain.setTargetAtTime(delayLevel, now, 0.05)
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.playbackRate.setTargetAtTime(
            playbackSpeed,
            now,
            0.05
          )
        } catch {}
      }
    }
  }, [volume, reverbLevel, delayLevel, playbackSpeed])

  const createImpulseBuffer = (ctx: BaseAudioContext) => {
    const rate = ctx.sampleRate
    const length = rate * 2.5
    const decay = 3.0
    const impulse = ctx.createBuffer(2, length, rate)
    const left = impulse.getChannelData(0)
    const right = impulse.getChannelData(1)
    for (let i = 0; i < length; i++) {
      const n = i / length
      const white = Math.random() * 2 - 1
      const envelope = Math.pow(1 - n, decay)
      left[i] = white * envelope
      right[i] = white * envelope
    }
    return impulse
  }

  const getImpulseBuffer = (ctx: AudioContext) => {
    if (impulseBufferRef.current) return impulseBufferRef.current
    impulseBufferRef.current = createImpulseBuffer(ctx)
    return impulseBufferRef.current
  }

  useEffect(() => {
    wordRefs.current = []
  }, [text])

  useEffect(() => {
    if (
      isPlaying &&
      currentWordIndex >= 0 &&
      wordRefs.current[currentWordIndex]
    ) {
      wordRefs.current[currentWordIndex]?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
      })
    }
  }, [currentWordIndex, isPlaying])

  useEffect(() => {
    return () => {
      stopAllAudio(true)
      stopDictation()
      if (audioContextRef.current)
        audioContextRef.current.close().catch(() => {})
    }
  }, [])

  const words = useMemo(() => text.split(/(\s+)/), [text])

  const stopAllAudio = useCallback((manual: boolean = true) => {
    if (manual) {
      isPlayingRef.current = false
      setIsPlaying(false)
      setCurrentWordIndex(-1)
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop()
      } catch {}
      try {
        sourceNodeRef.current.disconnect()
      } catch {}
      sourceNodeRef.current = null
    }
    cancelAnimationFrame(animationFrameRef.current)
    if (manual) {
      if (visualizerCanvasRef.current) {
        const ctx = visualizerCanvasRef.current.getContext("2d")
        if (ctx)
          ctx.clearRect(
            0,
            0,
            visualizerCanvasRef.current.width,
            visualizerCanvasRef.current.height
          )
      }
    }
  }, [])

  const getAudioContext = () => {
    if (
      !audioContextRef.current ||
      audioContextRef.current.state === "closed"
    ) {
      const AudioCtor =
        window.AudioContext || (window as any).webkitAudioContext
      audioContextRef.current = new AudioCtor()
    }
    return audioContextRef.current
  }

  const renderProcessedAudio = async (
    sourceBuffer: AudioBuffer
  ): Promise<AudioBuffer> => {
    const effectiveSpeed = speedRef.current
    const tailSeconds =
      reverbLevelRef.current > 0 || delayLevelRef.current > 0 ? 3.0 : 0.5
    const duration = sourceBuffer.duration / effectiveSpeed
    const length = Math.ceil((duration + tailSeconds) * sourceBuffer.sampleRate)

    const OfflineCtor =
      (window as any).OfflineAudioContext ||
      (window as any).webkitOfflineAudioContext
    const offlineCtx = new OfflineCtor(1, length, sourceBuffer.sampleRate)

    const source = offlineCtx.createBufferSource()
    source.buffer = sourceBuffer
    source.playbackRate.value = effectiveSpeed

    const compressor = offlineCtx.createDynamicsCompressor()
    const masterGain = offlineCtx.createGain()
    masterGain.gain.value = volumeRef.current
    const reverbGain = offlineCtx.createGain()
    reverbGain.gain.value = reverbLevelRef.current
    const convolver = offlineCtx.createConvolver()
    convolver.buffer = createImpulseBuffer(offlineCtx)
    const delayNode = offlineCtx.createDelay()
    delayNode.delayTime.value = 0.35
    const delayFeedback = offlineCtx.createGain()
    delayFeedback.gain.value = 0.3
    const delayOutputGain = offlineCtx.createGain()
    delayOutputGain.gain.value = delayLevelRef.current

    source.connect(compressor)
    source.connect(convolver)
    convolver.connect(reverbGain)
    reverbGain.connect(compressor)
    source.connect(delayNode)
    delayNode.connect(delayFeedback)
    delayFeedback.connect(delayNode)
    delayNode.connect(delayOutputGain)
    delayOutputGain.connect(compressor)
    compressor.connect(masterGain)
    masterGain.connect(offlineCtx.destination)

    source.start(0)
    return await offlineCtx.startRendering()
  }

  const canvasSizeRef = useRef({ width: 0, height: 0 })
  const gradientRef = useRef<CanvasGradient | null>(null)
  const lastHeightRef = useRef<number>(0)

  useEffect(() => {
    if (!visualizerCanvasRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        if (visualizerCanvasRef.current) {
          visualizerCanvasRef.current.width = width * dpr
          visualizerCanvasRef.current.height = height * dpr
          canvasSizeRef.current = { width: width * dpr, height: height * dpr }
        }
      }
    })
    observer.observe(visualizerCanvasRef.current)
    return () => observer.disconnect()
  }, [])

  const drawVisualizer = () => {
    if (!analyserRef.current || !visualizerCanvasRef.current) return
    const canvas = visualizerCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvasSizeRef.current
    if (width === 0 || height === 0) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    ctx.clearRect(0, 0, width, height)

    const barWidth = (width / bufferLength) * 2.5
    let x = 0

    if (height !== lastHeightRef.current || !gradientRef.current) {
      gradientRef.current = ctx.createLinearGradient(0, 0, 0, height)
      gradientRef.current.addColorStop(0, "#3b82f6")
      gradientRef.current.addColorStop(1, "#06b6d4")
      lastHeightRef.current = height
    }
    ctx.fillStyle = gradientRef.current

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)
      x += barWidth + 1
    }
  }

  const playBuffer = useCallback(
    (buffer: AudioBuffer) => {
      const ctx = getAudioContext()
      if (ctx.state === "suspended") ctx.resume()

      stopAllAudio(false)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = speedRef.current

      const compressor = ctx.createDynamicsCompressor()
      const masterGain = ctx.createGain()
      masterGain.gain.value = volumeRef.current
      gainNodeRef.current = masterGain

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8

      const reverbGain = ctx.createGain()
      reverbGain.gain.value = reverbLevelRef.current
      reverbGainRef.current = reverbGain
      const convolver = ctx.createConvolver()
      convolver.buffer = getImpulseBuffer(ctx)

      const delayNode = ctx.createDelay()
      delayNode.delayTime.value = 0.35
      const delayFeedback = ctx.createGain()
      delayFeedback.gain.value = 0.3
      const delayOutputGain = ctx.createGain()
      delayOutputGain.gain.value = delayLevelRef.current
      delayGainRef.current = delayOutputGain

      source.connect(compressor)
      source.connect(convolver)
      convolver.connect(reverbGain)
      reverbGain.connect(compressor)
      source.connect(delayNode)
      delayNode.connect(delayFeedback)
      delayFeedback.connect(delayNode)
      delayNode.connect(delayOutputGain)
      delayOutputGain.connect(compressor)
      compressor.connect(masterGain)
      masterGain.connect(analyser)
      analyser.connect(ctx.destination)

      sourceNodeRef.current = source
      analyserRef.current = analyser
      startTimeRef.current = ctx.currentTime

      setIsPlaying(true)
      isPlayingRef.current = true
      setCurrentWordIndex(-1)

      const tick = () => {
        if (!ctx || !isPlayingRef.current) return
        const elapsed = ctx.currentTime - startTimeRef.current
        const bufferPosition = elapsed * speedRef.current
        const timings = wordTimingsRef.current

        let foundIndex = -1
        let low = 0
        let high = timings.length - 1
        while (low <= high) {
          const mid = Math.floor((low + high) / 2)
          if (
            bufferPosition >= timings[mid].start &&
            bufferPosition <= timings[mid].end
          ) {
            foundIndex = mid
            break
          } else if (bufferPosition < timings[mid].start) {
            high = mid - 1
          } else {
            low = mid + 1
          }
        }
        setCurrentWordIndex(foundIndex)
        drawVisualizer()

        if (elapsed < buffer.duration / speedRef.current + 3.0) {
          animationFrameRef.current = requestAnimationFrame(tick)
        }
      }
      animationFrameRef.current = requestAnimationFrame(tick)

      source.onended = () => {
        if (isLoopEnabledRef.current && isPlayingRef.current) {
          setTimeout(() => {
            if (isPlayingRef.current) playBuffer(buffer)
          }, 50)
        } else {
          setIsPlaying(false)
          isPlayingRef.current = false
          setCurrentWordIndex(-1)
        }
      }

      source.start()
    },
    [stopAllAudio]
  )

  const handleGenerate = async () => {
    if (!text.trim()) return
    setIsLoading(true)
    setError(null)
    setLastAudioBase64(null)
    currentAudioBufferRef.current = null
    stopAllAudio(true)

    const ctx = getAudioContext()
    if (ctx.state === "suspended") await ctx.resume()

    try {
      const MAX_CHUNK_LENGTH = 400
      const chunks: string[] = []
      const sentences = text.split(/(?<=[.!?])\s+/)

      let currentChunk = ""
      for (const sentence of sentences) {
        if (!sentence.trim()) continue
        if (currentChunk.length + sentence.length + 1 > MAX_CHUNK_LENGTH) {
          if (currentChunk) chunks.push(currentChunk.trim())
          currentChunk = sentence
        } else {
          currentChunk = currentChunk
            ? `${currentChunk} ${sentence}`
            : sentence
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim())

      const finalChunks: string[] = []
      for (const chunk of chunks) {
        if (chunk.length <= MAX_CHUNK_LENGTH) {
          finalChunks.push(chunk)
        } else {
          const chunkWords = chunk.split(/\s+/)
          let temp = ""
          for (const word of chunkWords) {
            if (temp.length + word.length + 1 > MAX_CHUNK_LENGTH) {
              if (temp) finalChunks.push(temp.trim())
              temp = word
            } else {
              temp = temp ? `${temp} ${word}` : word
            }
          }
          if (temp) finalChunks.push(temp.trim())
        }
      }

      let combinedPcmData = new Uint8Array(0)

      for (let i = 0; i < finalChunks.length; i++) {
        const chunk = finalChunks[i]
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chunk,
            voiceName: selectedVoice.geminiVoice,
            persona: selectedVoice.persona,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)

        const pcmData = decodeBase64(data.audio)
        const newCombined = new Uint8Array(
          combinedPcmData.length + pcmData.length
        )
        newCombined.set(combinedPcmData)
        newCombined.set(pcmData, combinedPcmData.length)
        combinedPcmData = newCombined
      }

      const combinedBase64 = encodeBase64(combinedPcmData)
      setLastAudioBase64(combinedBase64)

      const audioBuffer = await decodeAudioData(combinedPcmData, ctx, 24000, 1)
      currentAudioBufferRef.current = audioBuffer

      const duration = audioBuffer.duration
      const textWords = words.filter((w) => !/^\s+$/.test(w))
      const totalChars = textWords.join("").length
      let currentOffset = 0

      wordTimingsRef.current = textWords.map((word) => {
        const wordWeight = word.length / (totalChars || 1)
        const wordDuration = wordWeight * duration
        const timing = {
          word,
          start: currentOffset,
          end: currentOffset + wordDuration,
        }
        currentOffset += wordDuration
        return timing
      })

      playBuffer(audioBuffer)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Synthese fehlgeschlagen. Bitte API Key prüfen.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!currentAudioBufferRef.current) return
    setIsRendering(true)
    try {
      const renderedBuffer = await renderProcessedAudio(
        currentAudioBufferRef.current
      )
      const blob = audioBufferToWav(renderedBuffer, downloadQuality)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const kbpsLabel =
        downloadQuality === 24000 ? "320kbps" : "256kbps"
      a.download = `deutsch_ki_${selectedVoice.shortName.toLowerCase()}_${kbpsLabel}_FX.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError("Download fehlgeschlagen.")
    } finally {
      setIsRendering(false)
    }
  }

  const handleTranslate = async () => {
    if (arabicText) {
      setArabicText(null)
      return
    }
    if (!text.trim()) return
    setIsTranslating(true)
    setArabicText(null)
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setArabicText(data.translation)
    } catch {
      setError("Übersetzung nicht verfügbar.")
    } finally {
      setIsTranslating(false)
    }
  }

  const handleTestVoice = async (voice: GermanVoice) => {
    if (isTestingVoice) return
    setIsTestingVoice(true)
    setError(null)
    stopAllAudio(true)

    try {
      const ctx = getAudioContext()
      if (ctx.state === "suspended") await ctx.resume()

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voice.previewSnippet,
          voiceName: voice.geminiVoice,
          persona: voice.persona,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      const pcmData = decodeBase64(data.audio)
      const audioBuffer = await decodeAudioData(pcmData, ctx, 24000, 1)

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      const masterGain = ctx.createGain()
      masterGain.gain.value = volumeRef.current
      source.connect(masterGain)
      masterGain.connect(ctx.destination)
      source.onended = () => setIsTestingVoice(false)
      source.start()
    } catch (err: any) {
      setError(err.message || "Fehler beim Testen der Stimme.")
      setIsTestingVoice(false)
    }
  }

  const startDictation = async () => {
    if (isDictating) {
      stopDictation()
      return
    }
    try {
      const { GoogleGenAI, Modality } = await import("@google/genai")

      // For dictation, we need the API key client-side via a fetch to a config endpoint
      // Or we use a simpler approach with the Web Speech API as fallback
      // For now, use the native SpeechRecognition API as it doesn't need API keys
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition

      if (!SpeechRecognition) {
        setError(
          "Spracherkennung wird von diesem Browser nicht unterstützt."
        )
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = "de-DE"
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: any) => {
        let transcript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript
          }
        }
        if (transcript) {
          setText((p) => (p ? `${p} ${transcript}` : transcript))
        }
      }

      recognition.onerror = () => {
        setIsDictating(false)
      }

      recognition.onend = () => {
        if (isDictating) {
          try {
            recognition.start()
          } catch {}
        }
      }

      recognition.start()
      liveSessionRef.current = recognition
      setIsDictating(true)
    } catch {
      setError("Mikrofon Zugriff verweigert.")
      setIsDictating(false)
    }
  }

  const stopDictation = () => {
    try {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop?.()
        liveSessionRef.current.close?.()
      }
    } catch {}
    if (dictationAudioContextRef.current) {
      dictationAudioContextRef.current.close().catch(() => {})
      dictationAudioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    liveSessionRef.current = null
    setIsDictating(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {showScanner && (
        <CameraScanner
          onTextScanned={(t) => setText((p) => (p ? `${p}\n${t}` : t))}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <ToolbarButton
          onClick={startDictation}
          active={isDictating}
          variant="rose"
          icon={isDictating ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          label={isDictating ? "STOP" : "DIKTAT"}
        />
        <ToolbarButton
          onClick={() => setShowScanner(true)}
          variant="emerald"
          icon={<Camera className="w-4 h-4" />}
          label="SCAN"
        />
        <ToolbarButton
          onClick={handleTranslate}
          disabled={isTranslating}
          active={!!arabicText}
          variant="amber"
          icon={
            isTranslating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Languages className="w-4 h-4" />
            )
          }
          label="ARAB"
        />
      </div>

      {/* Text Editor */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-card transition-all duration-300 hover:border-primary/20">
        <canvas
          ref={visualizerCanvasRef}
          className={cn(
            "absolute bottom-0 left-0 w-full h-24 pointer-events-none transition-opacity duration-500 z-0",
            isPlaying ? "opacity-20" : "opacity-0"
          )}
        />

        {isPlaying && (
          <div className="absolute inset-0 z-20 bg-card/95 backdrop-blur-sm p-6 overflow-y-auto pointer-events-none">
            <div className="flex flex-wrap gap-x-1.5 gap-y-1">
              {(() => {
                let wordCounter = 0
                return words.map((part, idx) => {
                  const isWhitespace = /^\s+$/.test(part)
                  const isActive =
                    !isWhitespace && wordCounter === currentWordIndex
                  const localIndex = wordCounter
                  if (!isWhitespace) wordCounter++
                  return (
                    <span
                      key={`w-${idx}`}
                      ref={(el) => {
                        if (!isWhitespace && el)
                          wordRefs.current[localIndex] = el
                      }}
                      className={cn(
                        "transition-all duration-150 inline-block text-lg font-mono",
                        isActive
                          ? "text-primary font-bold scale-105"
                          : "text-muted-foreground/40"
                      )}
                    >
                      {part}
                    </span>
                  )
                })
              })()}
            </div>
          </div>
        )}

        <textarea
          className={cn(
            "w-full min-h-[240px] bg-transparent border-none outline-none resize-none text-foreground/90 placeholder-muted-foreground/30 relative z-10 p-6 font-mono text-base leading-relaxed",
            isPlaying && "opacity-0"
          )}
          placeholder="Geben Sie Ihren deutschen Text ein..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isPlaying}
          spellCheck={false}
        />

        {/* Status Bar */}
        <div className="bg-secondary/50 border-t border-border px-4 py-2.5 flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest relative z-30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              {text.length} chars
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                isDictating && "text-destructive animate-pulse font-bold"
              )}
            >
              {isDictating ? "REC" : "MIC OFF"}
            </span>
            <span className="w-px h-3 bg-border" />
            <span
              className={cn(
                isPlaying && "text-primary animate-pulse font-bold"
              )}
            >
              {isPlaying ? "PLAYING" : "IDLE"}
            </span>
          </div>
        </div>
      </div>

      {/* Translation Output */}
      {arabicText && (
        <div className="rounded-xl border border-border bg-card p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[10px] font-mono text-amber-500 tracking-widest uppercase">
              Output [Arabic]
            </span>
          </div>
          <div
            className="text-xl text-foreground/90 leading-relaxed"
            dir="rtl"
          >
            {arabicText}
          </div>
        </div>
      )}

      {/* Player Section */}
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 space-y-6">
        {/* Voice Selector */}
        <VoiceSelector
          voices={GERMAN_VOICES}
          selectedVoice={selectedVoice}
          onSelect={setSelectedVoice}
          onTest={handleTestVoice}
          isTesting={isTestingVoice}
        />

        {/* Playback Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Play Button */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={isPlaying ? () => stopAllAudio(true) : handleGenerate}
              disabled={
                isLoading || isRendering || (!text.trim() && !isPlaying)
              }
              className={cn(
                "relative group w-16 h-16 flex items-center justify-center rounded-full transition-all duration-300",
                isLoading ||
                  isRendering ||
                  (!text.trim() && !isPlaying)
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:scale-105"
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 rounded-full blur-lg transition-all",
                  isPlaying
                    ? "bg-destructive/30"
                    : "bg-primary/30 group-hover:bg-primary/50"
                )}
              />
              <div
                className={cn(
                  "relative w-full h-full rounded-full border flex items-center justify-center transition-all",
                  isPlaying
                    ? "bg-destructive/20 border-destructive/40 text-destructive"
                    : "bg-primary/20 border-primary/40 text-primary group-hover:bg-primary/30"
                )}
              >
                {isLoading || isRendering ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isPlaying ? (
                  <Square className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </div>
            </button>

            <button
              onClick={() => setIsLoopEnabled(!isLoopEnabled)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                isLoopEnabled
                  ? "bg-accent/20 text-accent border-accent/40"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              )}
            >
              <Repeat className="w-3 h-3" />
              {isLoopEnabled ? "Loop On" : "Loop"}
            </button>
          </div>

          {/* Effects Knobs */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-around bg-secondary/50 p-4 rounded-xl border border-border">
              <ControlKnob
                value={speedKnobValue}
                onChange={setSpeedKnobValue}
                label="SPD"
                color="#3b82f6"
                size={44}
                formatValue={(v) => (0.5 + v * 2).toFixed(1) + "x"}
              />
              <ControlKnob
                value={reverbLevel}
                onChange={setReverbLevel}
                label="REV"
                color="#06b6d4"
                size={44}
              />
              <ControlKnob
                value={delayLevel}
                onChange={setDelayLevel}
                label="DLY"
                color="#3b82f6"
                size={44}
              />
              <div className="ml-2 pl-2 border-l border-border">
                <ControlKnob
                  value={volume}
                  onChange={setVolume}
                  label="VOL"
                  color="#e8eaed"
                  size={48}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Download */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={downloadQuality}
              onChange={(e) => setDownloadQuality(Number(e.target.value))}
              className="w-full h-10 appearance-none bg-secondary border border-border rounded-lg text-[11px] font-mono text-muted-foreground uppercase tracking-wider px-3 focus:outline-none focus:border-primary/40 hover:bg-secondary/80 transition-all cursor-pointer"
            >
              <option value={24000}>320 KBPS (Studio)</option>
              <option value={16000}>256 KBPS (Medium)</option>
            </select>
          </div>
          <button
            onClick={handleDownload}
            disabled={isRendering || !lastAudioBase64}
            className={cn(
              "flex-[1.5] h-10 rounded-lg border flex items-center justify-center gap-2 transition-all text-[11px] font-bold uppercase tracking-wider",
              isRendering || !lastAudioBase64
                ? "bg-secondary border-border text-muted-foreground cursor-not-allowed"
                : "bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
            )}
          >
            {isRendering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download
          </button>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  variant,
  icon,
  label,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  variant: "rose" | "emerald" | "amber"
  icon: React.ReactNode
  label: string
}) {
  const colors = {
    rose: {
      base: "border-destructive/20 text-destructive/80 hover:bg-destructive/10 hover:border-destructive/30",
      active:
        "bg-destructive/20 border-destructive/40 text-destructive shadow-[0_0_12px_rgba(239,68,68,0.2)]",
    },
    emerald: {
      base: "border-green-500/20 text-green-500/80 hover:bg-green-500/10 hover:border-green-500/30",
      active:
        "bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.2)]",
    },
    amber: {
      base: "border-amber-500/20 text-amber-500/80 hover:bg-amber-500/10 hover:border-amber-500/30",
      active:
        "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 px-3 rounded-lg flex items-center gap-2 border transition-all text-xs font-medium",
        active ? colors[variant].active : colors[variant].base,
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
