
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { GERMAN_VOICES } from '../constants';
import { generateSpeech, translateText } from '../services/gemini';
import { decode, decodeAudioData, encode, audioBufferToWav } from '../utils/audio';
import { CameraScanner } from './CameraScanner';

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

// --- Custom Control Knob Component ---
interface ControlKnobProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  color?: string;
  size?: number;
  formatValue?: (val: number) => string;
}

const ControlKnob: React.FC<ControlKnobProps> = ({ 
  value, 
  onChange, 
  label, 
  color = "#6366f1", 
  size = 50,
  formatValue 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaY = startYRef.current - e.clientY;
    const change = deltaY / 150; 
    let newValue = startValueRef.current + change;
    newValue = Math.max(0, Math.min(1, newValue));
    onChange(newValue);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const ticks = [];
  const numTicks = 20; 
  const startAngle = 135;
  const endAngle = 405;
  
  for (let i = 0; i < numTicks; i++) {
    const pct = i / (numTicks - 1);
    const angle = startAngle + (endAngle - startAngle) * pct;
    const rad = (angle * Math.PI) / 180;
    const isLit = value >= pct;
    
    // Ticks positioning
    const innerR = 34;
    const outerR = 44;
    const x1 = 50 + innerR * Math.cos(rad);
    const y1 = 50 + innerR * Math.sin(rad);
    const x2 = 50 + outerR * Math.cos(rad);
    const y2 = 50 + outerR * Math.sin(rad);

    ticks.push(
      <line 
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isLit ? color : "#1e293b"}
        strokeWidth={isLit ? 2 : 1.5}
        strokeLinecap="round"
        style={{ 
            opacity: isLit ? 1 : 0.3
        }}
      />
    );
  }

  const knobAngle = startAngle + (endAngle - startAngle) * value;

  return (
    <div 
      className="relative flex flex-col items-center justify-center cursor-ns-resize group select-none touch-none"
      style={{ width: size, height: size }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      title={label}
    >
      <svg width="140%" height="140%" viewBox="0 0 100 100" className="pointer-events-none z-0 absolute top-[-20%] left-[-20%]">
        {ticks}
      </svg>
      
      {/* Central Knob Body */}
      <div className="relative z-10 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_5px_15px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#333338] to-[#121214] border border-[#27272a] flex items-center justify-center overflow-hidden"
           style={{ width: size * 0.75, height: size * 0.75 }}>
           
           {/* Indicator Dot (Rotates) */}
           <div 
             className="absolute w-full h-full pointer-events-none"
             style={{ transform: `rotate(${knobAngle}deg)` }}
           >
              <div 
                className="absolute w-1.5 h-1.5 rounded-full top-[10%] left-1/2 -translate-x-1/2 shadow-[0_0_5px_currentColor]"
                style={{ backgroundColor: value > 0 ? color : '#52525b' }}
              />
           </div>

           {/* Value Readout INSIDE Knob (Fixed) */}
           <span className="text-[9px] font-mono font-bold text-white/90 select-none z-20 tabular-nums tracking-tighter">
              {formatValue ? formatValue(value).replace(/x|%/, '') : Math.round(value * 100)}
              <span className="text-[7px] opacity-60 ml-[1px]">{formatValue?.(value).includes('x') ? 'x' : '%'}</span>
           </span>
      </div>

      {label && (
          <div 
            className="absolute -bottom-4 font-mono font-bold text-[9px] text-[#71717a] group-hover:text-white uppercase tracking-wider pointer-events-none whitespace-nowrap transition-colors"
          >
            {label}
          </div>
      )}
    </div>
  );
};


export const VoiceStudio: React.FC = () => {
  // State
  const [text, setText] = useState('');
  const [arabicText, setArabicText] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(GERMAN_VOICES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false); 
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [downloadQuality, setDownloadQuality] = useState<number>(24000); 
  
  // Audio Controls
  const [volume, setVolume] = useState(0.85);
  const [reverbLevel, setReverbLevel] = useState(0.0);
  const [delayLevel, setDelayLevel] = useState(0.0);
  const [speedKnobValue, setSpeedKnobValue] = useState(0.25); 
  const [showControls] = useState(true);
  
  const playbackSpeed = useMemo(() => 0.5 + (speedKnobValue * 2.0), [speedKnobValue]);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const dictationAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null); 
  const reverbGainRef = useRef<GainNode | null>(null); 
  const delayGainRef = useRef<GainNode | null>(null); 
  const impulseBufferRef = useRef<AudioBuffer | null>(null); 

  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentAudioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const wordTimingsRef = useRef<WordTiming[]>([]);
  const animationFrameRef = useRef<number>(0);
  const liveSessionRef = useRef<any>(null);
  
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const isLoopEnabledRef = useRef(isLoopEnabled);
  const isPlayingRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const reverbLevelRef = useRef(reverbLevel);
  const delayLevelRef = useRef(delayLevel);
  const speedRef = useRef(playbackSpeed);

  useEffect(() => { isLoopEnabledRef.current = isLoopEnabled; }, [isLoopEnabled]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { reverbLevelRef.current = reverbLevel; }, [reverbLevel]);
  useEffect(() => { delayLevelRef.current = delayLevel; }, [delayLevel]);
  useEffect(() => { speedRef.current = playbackSpeed; }, [playbackSpeed]);
  
  // Realtime Audio Parameter Updates
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'running') {
       const now = ctx.currentTime;
       if (gainNodeRef.current) gainNodeRef.current.gain.setTargetAtTime(volume, now, 0.05);
       if (reverbGainRef.current) reverbGainRef.current.gain.setTargetAtTime(reverbLevel, now, 0.05);
       if (delayGainRef.current) delayGainRef.current.gain.setTargetAtTime(delayLevel, now, 0.05);
       if (sourceNodeRef.current) {
          try { sourceNodeRef.current.playbackRate.setTargetAtTime(playbackSpeed, now, 0.05); } catch (e) {}
       }
    }
  }, [volume, reverbLevel, delayLevel, playbackSpeed]);

  const createImpulseBuffer = (ctx: BaseAudioContext) => {
    const rate = ctx.sampleRate;
    const length = rate * 2.5;
    const decay = 3.0;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        const n = i / length;
        const white = (Math.random() * 2 - 1);
        const envelope = Math.pow(1 - n, decay);
        left[i] = white * envelope;
        right[i] = white * envelope; 
    }
    return impulse;
  };

  const getImpulseBuffer = (ctx: AudioContext) => {
    if (impulseBufferRef.current) return impulseBufferRef.current;
    impulseBufferRef.current = createImpulseBuffer(ctx);
    return impulseBufferRef.current;
  };

  useEffect(() => { wordRefs.current = []; }, [text]);

  useEffect(() => {
    if (isPlaying && currentWordIndex >= 0 && wordRefs.current[currentWordIndex]) {
      wordRefs.current[currentWordIndex]?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [currentWordIndex, isPlaying]);

  useEffect(() => {
    return () => {
      stopAllAudio(true);
      stopDictation(); 
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  const words = useMemo(() => text.split(/(\s+)/), [text]);

  const stopAllAudio = useCallback((manual: boolean = true) => {
    if (manual) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentWordIndex(-1);
    }
    
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    cancelAnimationFrame(animationFrameRef.current);
    
    if (manual) {
      if (visualizerCanvasRef.current) {
        const ctx = visualizerCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, visualizerCanvasRef.current.width, visualizerCanvasRef.current.height);
      }
    }
  }, []);

  const getAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtor = (window.AudioContext || (window as any).webkitAudioContext);
      audioContextRef.current = new AudioCtor(); 
    }
    return audioContextRef.current;
  };

  const renderProcessedAudio = async (sourceBuffer: AudioBuffer): Promise<AudioBuffer> => {
    const effectiveSpeed = speedRef.current;
    const tailSeconds = (reverbLevelRef.current > 0 || delayLevelRef.current > 0) ? 3.0 : 0.5;
    const duration = sourceBuffer.duration / effectiveSpeed;
    const length = Math.ceil((duration + tailSeconds) * sourceBuffer.sampleRate);
    
    const OfflineCtor = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtor(1, length, sourceBuffer.sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = sourceBuffer;
    source.playbackRate.value = effectiveSpeed;

    const compressor = offlineCtx.createDynamicsCompressor();
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = volumeRef.current;
    const reverbGain = offlineCtx.createGain();
    reverbGain.gain.value = reverbLevelRef.current;
    const convolver = offlineCtx.createConvolver();
    convolver.buffer = createImpulseBuffer(offlineCtx); 
    const delayNode = offlineCtx.createDelay();
    delayNode.delayTime.value = 0.35;
    const delayFeedback = offlineCtx.createGain();
    delayFeedback.gain.value = 0.3;
    const delayOutputGain = offlineCtx.createGain();
    delayOutputGain.gain.value = delayLevelRef.current;

    source.connect(compressor);
    source.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(compressor);
    source.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayOutputGain);
    delayOutputGain.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    source.start(0);
    return await offlineCtx.startRendering();
  };

  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const gradientRef = useRef<CanvasGradient | null>(null);
  const lastHeightRef = useRef<number>(0);

  useEffect(() => {
    if (!visualizerCanvasRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        if (visualizerCanvasRef.current) {
          visualizerCanvasRef.current.width = width * dpr;
          visualizerCanvasRef.current.height = height * dpr;
          canvasSizeRef.current = { width: width * dpr, height: height * dpr };
        }
      }
    });
    observer.observe(visualizerCanvasRef.current);
    return () => observer.disconnect();
  }, []);

  const drawVisualizer = () => {
    if (!analyserRef.current || !visualizerCanvasRef.current) return;
    const canvas = visualizerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = (width / bufferLength) * 2.5;
    let x = 0;
    
    if (height !== lastHeightRef.current || !gradientRef.current) {
      gradientRef.current = ctx.createLinearGradient(0, 0, 0, height);
      gradientRef.current.addColorStop(0, '#818cf8'); 
      gradientRef.current.addColorStop(1, '#22d3ee'); 
      lastHeightRef.current = height;
    }
    ctx.fillStyle = gradientRef.current;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  };

  const playBuffer = useCallback((buffer: AudioBuffer) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    stopAllAudio(false);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = speedRef.current;

    const compressor = ctx.createDynamicsCompressor();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volumeRef.current;
    gainNodeRef.current = masterGain;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = reverbLevelRef.current;
    reverbGainRef.current = reverbGain;
    const convolver = ctx.createConvolver();
    convolver.buffer = getImpulseBuffer(ctx);

    const delayNode = ctx.createDelay();
    delayNode.delayTime.value = 0.35;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.3;
    const delayOutputGain = ctx.createGain();
    delayOutputGain.gain.value = delayLevelRef.current;
    delayGainRef.current = delayOutputGain;

    source.connect(compressor);
    source.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(compressor);
    source.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayOutputGain);
    delayOutputGain.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
    
    sourceNodeRef.current = source;
    analyserRef.current = analyser;
    startTimeRef.current = ctx.currentTime;
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    setCurrentWordIndex(-1);
    
    const tick = () => {
      if (!ctx || !isPlayingRef.current) return;
      const elapsed = ctx.currentTime - startTimeRef.current;
      const bufferPosition = elapsed * speedRef.current;
      const timings = wordTimingsRef.current;
      
      let foundIndex = -1;
      let low = 0;
      let high = timings.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (bufferPosition >= timings[mid].start && bufferPosition <= timings[mid].end) {
          foundIndex = mid;
          break;
        } else if (bufferPosition < timings[mid].start) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      setCurrentWordIndex(foundIndex);
      drawVisualizer();

      if (elapsed < (buffer.duration / speedRef.current) + 3.0) { 
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };
    animationFrameRef.current = requestAnimationFrame(tick);

    source.onended = () => {
      if (isLoopEnabledRef.current && isPlayingRef.current) {
        setTimeout(() => {
          if (isPlayingRef.current) playBuffer(buffer);
        }, 50);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setCurrentWordIndex(-1);
      }
    };

    source.start();
  }, [stopAllAudio, selectedVoice.name]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);
    setLastAudioBase64(null);
    currentAudioBufferRef.current = null;
    stopAllAudio(true);

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    try {
      const MAX_CHUNK_LENGTH = 400;
      const chunks: string[] = [];
      const sentences = text.split(/(?<=[.!?])\s+/);
      
      let currentChunk = "";
      for (const sentence of sentences) {
        if (!sentence.trim()) continue;
        if (currentChunk.length + sentence.length + 1 > MAX_CHUNK_LENGTH) {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim());
      
      const finalChunks: string[] = [];
      for (const chunk of chunks) {
        if (chunk.length <= MAX_CHUNK_LENGTH) {
          finalChunks.push(chunk);
        } else {
          const chunkWords = chunk.split(/\s+/);
          let temp = "";
          for (const word of chunkWords) {
            if (temp.length + word.length + 1 > MAX_CHUNK_LENGTH) {
              if (temp) finalChunks.push(temp.trim());
              temp = word;
            } else {
              temp = temp ? `${temp} ${word}` : word;
            }
          }
          if (temp) finalChunks.push(temp.trim());
        }
      }

      let combinedPcmData = new Uint8Array(0);
      
      for (let i = 0; i < finalChunks.length; i++) {
        const chunk = finalChunks[i];
        const base64 = await generateSpeech(chunk, selectedVoice.geminiVoice, selectedVoice.persona);
        const pcmData = decode(base64);
        const newCombined = new Uint8Array(combinedPcmData.length + pcmData.length);
        newCombined.set(combinedPcmData);
        newCombined.set(pcmData, combinedPcmData.length);
        combinedPcmData = newCombined;
      }
      
      const combinedBase64 = encode(combinedPcmData);
      setLastAudioBase64(combinedBase64);
      
      const audioBuffer = await decodeAudioData(combinedPcmData, ctx, 24000, 1);
      currentAudioBufferRef.current = audioBuffer;
      
      const duration = audioBuffer.duration;
      const textWords = words.filter(w => !/^\s+$/.test(w));
      const totalChars = textWords.join('').length;
      let currentOffset = 0;
      
      wordTimingsRef.current = textWords.map(word => {
        const wordWeight = word.length / (totalChars || 1);
        const wordDuration = wordWeight * duration;
        const timing = { word, start: currentOffset, end: currentOffset + wordDuration };
        currentOffset += wordDuration;
        return timing;
      });

      playBuffer(audioBuffer);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Synthese fehlgeschlagen. Bitte API Key prüfen.');
    } finally {
      setIsLoading(false);
    }
  };

  const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const handleDownload = async () => {
    if (!currentAudioBufferRef.current) return;
    setIsRendering(true);
    try {
        const renderedBuffer = await renderProcessedAudio(currentAudioBufferRef.current);
        const blob = audioBufferToWav(renderedBuffer, downloadQuality);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const kbpsLabel = downloadQuality === 24000 ? '320kbps' : downloadQuality === 16000 ? '256kbps' : '128kbps';
        a.download = `deutsch_ki_${sanitizeFilename(selectedVoice.name)}_${kbpsLabel}_FX.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(err) {
        setError("Download fehlgeschlagen.");
    } finally {
        setIsRendering(false);
    }
  };

  const handleTranslate = async () => {
    if (arabicText) { setArabicText(null); return; }
    if (!text.trim()) return;
    setIsTranslating(true);
    setArabicText(null);
    try {
      const translated = await translateText(text);
      setArabicText(translated);
    } catch (err) {
      setError("Übersetzung nicht verfügbar.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTestVoice = async (voice: ExtendedGermanVoice) => {
    if (isTestingVoice) return;
    setIsTestingVoice(true);
    setError(null);
    stopAllAudio(true);

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const base64 = await generateSpeech(voice.previewSnippet, voice.geminiVoice, voice.persona);
      const pcmData = decode(base64);
      const audioBuffer = await decodeAudioData(pcmData, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      const masterGain = ctx.createGain();
      masterGain.gain.value = volumeRef.current;
      
      source.connect(masterGain);
      masterGain.connect(ctx.destination);
      
      source.onended = () => {
        setIsTestingVoice(false);
      };
      
      source.start();
    } catch (err: any) {
      console.error("Test Voice Error:", err);
      setError(err.message || "Fehler beim Testen der Stimme.");
      setIsTestingVoice(false);
    }
  };

  const startDictation = async () => {
    if (isDictating) { stopDictation(); return; }
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        setError("API Key fehlt. Bitte fügen Sie ihn in die .env.local Datei ein.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream; 

      const ai = new GoogleGenAI({ apiKey });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      dictationAudioContextRef.current = audioCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsDictating(true);
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: (m) => {
            if (m.serverContent?.inputTranscription?.text) setText(p => p + m.serverContent!.inputTranscription!.text);
          },
          onerror: () => stopDictation(),
          onclose: () => stopDictation(),
        },
        config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {} },
      });
      liveSessionRef.current = sessionPromise;
      await sessionPromise;
    } catch (err) { setError("Mikrofon Zugriff verweigert."); setIsDictating(false); }
  };

  const stopDictation = () => {
    try { Promise.resolve(liveSessionRef.current).then(session => session?.close()); } catch {}
    if (dictationAudioContextRef.current) {
        dictationAudioContextRef.current.close().catch(() => {});
        dictationAudioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => { track.stop(); });
        mediaStreamRef.current = null;
    }
    setIsDictating(false);
  };

  return (
    <div className="space-y-12 animate-fadeIn max-w-7xl mx-auto font-sans">
      {showScanner && (
        <CameraScanner onTextScanned={(t) => setText(p => p ? `${p}\n${t}` : t)} onClose={() => setShowScanner(false)} />
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3 animate-pulse shadow-lg shadow-red-500/10">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-mono text-xs font-bold uppercase">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto hover:text-white transition-colors">&times;</button>
        </div>
      )}

      {/* --- VISION & MANUSCRIPT TERMINAL --- */}
      <section className="relative">
        <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        {/* NEW MULTI-COLOR TOOLBAR */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showControls ? 'max-h-52 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="bg-[#0f1115]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative z-20">
             <div className="flex flex-col xl:flex-row items-center justify-between gap-5">
                 
                 {/* PRIMARY ACTIONS */}
                 <div className="flex items-center gap-3 w-full xl:w-auto justify-center xl:justify-start flex-wrap sm:flex-nowrap">
                    
                    {/* MIC ON/OFF TOGGLE */}
                    <button 
                        onClick={startDictation} 
                        className={`h-11 px-5 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 relative group overflow-hidden border shadow-lg ${
                            isDictating 
                            ? 'bg-gradient-to-br from-rose-500 to-pink-600 border-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.4)]' 
                            : 'bg-gradient-to-br from-rose-500/10 to-pink-500/5 border-rose-500/20 text-rose-400 hover:from-rose-500/20 hover:to-pink-500/20 hover:border-rose-500/40 hover:shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        }`}
                    >
                        {isDictating && <span className="absolute inset-0 bg-white/20 animate-pulse"></span>}
                        <div className={`w-3 h-3 rounded-full transition-all ${isDictating ? 'bg-white shadow-[0_0_8px_white]' : 'bg-rose-900/50 border border-rose-500/50'}`}></div>
                        <svg className={`w-4 h-4 relative z-10 ${isDictating ? 'text-white' : 'text-current'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        <div className={`flex flex-col items-start leading-none relative z-10 ${isDictating ? 'text-white' : ''}`}>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-80">MICRO</span>
                            <span className="text-[10px] font-bold">{isDictating ? 'ON' : 'OFF'}</span>
                        </div>
                    </button>

                    {/* SCAN */}
                    <button 
                        onClick={() => setShowScanner(true)} 
                        className="h-11 px-5 rounded-xl flex items-center justify-center gap-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 hover:border-emerald-500/40 hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300 group shadow-lg"
                    >
                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform filter drop-shadow-[0_0_3px_currentColor]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="text-[10px] font-bold uppercase hidden sm:inline tracking-wider">SCAN</span>
                    </button>

                    {/* TRANSLATE */}
                    <button 
                        onClick={handleTranslate} 
                        disabled={isTranslating} 
                        className={`h-11 px-5 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 border shadow-lg ${
                            arabicText 
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.5)]' 
                            : 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 text-amber-400 border-amber-500/20 hover:from-amber-500/20 hover:to-orange-500/20 hover:border-amber-500/40 hover:text-amber-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        }`}
                    >
                        <svg className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''} filter drop-shadow-[0_0_2px_currentColor]`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                        <span className="text-[10px] font-bold uppercase hidden sm:inline tracking-wider">ARAB</span>
                    </button>
                 </div>
             </div>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-[#0a0c12]/80 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:border-indigo-500/30">
          <canvas ref={visualizerCanvasRef} className={`absolute bottom-0 left-0 w-full h-32 pointer-events-none transition-opacity duration-500 z-0 ${isPlaying ? 'opacity-30' : 'opacity-0'}`} />

          {isPlaying && (
            <div className="absolute inset-0 z-20 bg-[#05070a]/90 backdrop-blur-sm p-6 overflow-y-auto pointer-events-none scroll-smooth">
              <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                {(() => {
                  let wordCounter = 0;
                  return words.map((part, idx) => {
                    const isWhitespace = /^\s+$/.test(part);
                    const isActive = !isWhitespace && wordCounter === currentWordIndex;
                    const localIndex = wordCounter;
                    if (!isWhitespace) wordCounter++;
                    return (
                      <span key={`w-${idx}`} ref={(el) => { if (!isWhitespace && el) wordRefs.current[localIndex] = el; }} className={`transition-all duration-150 relative inline-block ${isActive ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 font-bold scale-105 z-10 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'text-slate-600'}`}>{part}</span>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          <textarea className={`w-full h-full min-h-[300px] bg-transparent border-none outline-none resize-none text-slate-300 placeholder-slate-700/50 selection:bg-indigo-500/30 relative z-10 ${isPlaying ? 'opacity-0' : 'opacity-100'} p-6 font-mono text-lg leading-relaxed`} placeholder="// Geben Sie Ihren Text ein..." value={text} onChange={(e) => setText(e.target.value)} disabled={isPlaying} spellCheck={false} />

          {/* Terminal Status Bar */}
          <div className="bg-[#050608] border-t border-white/5 px-4 py-3 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest relative z-30">
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span><span>Chars: {text.length}</span></div>
             </div>
             <div className="flex items-center gap-3">
               <span className={isDictating ? "text-rose-400 animate-pulse font-bold" : ""}>{isDictating ? "● REC ON" : "MIC OFF"}</span>
               <span className="w-px h-3 bg-white/10"></span>
               <span className={isPlaying ? "text-indigo-400 animate-pulse font-bold" : ""}>{isPlaying ? "PLAYING" : "IDLE"}</span>
             </div>
          </div>
        </div>

        {/* Translation Output */}
        {arabicText && (
          <div className="mt-4 relative animate-fadeInUp">
            <div className="bg-[#080a0f] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] text-amber-500/80 font-mono tracking-widest uppercase flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>Output [Arabic]</span>
              </div>
              <div className="text-2xl text-slate-200 font-light leading-relaxed font-serif" dir="rtl">{arabicText}</div>
            </div>
          </div>
        )}
      </section>
      
      {/* --- ARTISTIC PLAYER DECK --- */}
      <section className="relative mt-8 pb-10">
        {/* Glow behind the player */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-[60px] rounded-full pointer-events-none"></div>
        
        <div className="relative bg-[#0a0c12]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col lg:flex-row items-center gap-8">
          
          {/* 1. VOICE LIST & STATUS */}
          <div className="flex-1 w-full flex flex-col gap-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Synthesizer Voice
            </div>
            <div className="relative group w-full">
               <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl blur-md group-hover:bg-indigo-500/20 transition-colors"></div>
               <select 
                  value={selectedVoice.id}
                  onChange={(e) => { const v = GERMAN_VOICES.find(v => v.id === e.target.value); if(v) setSelectedVoice(v); }}
                  className="relative w-full appearance-none bg-[#050608]/80 border border-indigo-500/30 rounded-2xl text-lg font-light text-indigo-100 h-16 px-6 focus:outline-none focus:border-indigo-400 hover:bg-[#0f1218] transition-all cursor-pointer truncate pr-24 shadow-inner"
               >
                   {GERMAN_VOICES.map(v => (
                        <option key={v.id} value={v.id}>{v.name} — {v.gender}</option>
                   ))}
               </select>
               <div className="absolute right-14 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400/50">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
               </div>
               
               {/* Test Voice Button Inside Select */}
               <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTestVoice(selectedVoice); }}
                disabled={isTestingVoice}
                className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0 h-10 w-10 rounded-xl hover:bg-white/5 flex items-center justify-center transition-all z-10 group/btn"
                title="Test Voice"
               >
                {isTestingVoice ? (
                  <div className="w-4 h-4 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5 transition-transform group-hover/btn:scale-110" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11v2" className="stroke-[#0ea5e9]" />
                    <path d="M6 8v8" className="stroke-[#4f46e5]" />
                    <path d="M9 5v14" className="stroke-[#0ea5e9]" />
                    <path d="M12 2v20" className="stroke-[#4f46e5]" />
                    <path d="M15 6v12" className="stroke-[#0ea5e9]" />
                    <path d="M18 9v6" className="stroke-[#4f46e5]" />
                    <path d="M21 11v2" className="stroke-[#0ea5e9]" />
                  </svg>
                )}
               </button>
            </div>
          </div>

          {/* 2. CENTRAL PLAYBACK & LOOP */}
          <div className="flex flex-col items-center gap-4">
             {/* Main Action Button */}
             <button onClick={isPlaying ? () => stopAllAudio(true) : handleGenerate} disabled={isLoading || isRendering || (!text.trim() && !isPlaying)} className={`relative group w-24 h-24 flex items-center justify-center rounded-full transition-all duration-500 ${isLoading || isRendering || (!text.trim() && !isPlaying) ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105'}`}>
                <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${isPlaying ? 'bg-red-500/40 animate-pulse' : 'bg-indigo-500/40 group-hover:bg-indigo-500/60'}`}></div>
                <div className={`relative w-full h-full rounded-full border-2 flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all duration-500 ${isPlaying ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 group-hover:bg-indigo-500/30 group-hover:border-indigo-400 group-hover:text-indigo-200'}`}>
                   {isLoading || isRendering ? (
                     <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                   ) : isPlaying ? (
                     <div className="w-6 h-6 bg-current rounded-sm shadow-[0_0_15px_currentColor]"></div>
                   ) : (
                     <svg className="w-10 h-10 ml-2 fill-current drop-shadow-[0_0_10px_currentColor]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                   )}
                </div>
             </button>

             {/* Loop Button */}
             <button 
                onClick={() => setIsLoopEnabled(!isLoopEnabled)} 
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${
                    isLoopEnabled 
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.3)]' 
                    : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10 hover:text-slate-300'
                }`}
             >
                <svg className={`w-3.5 h-3.5 ${isLoopEnabled ? 'animate-spin-slow' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {isLoopEnabled ? 'Loop Active' : 'Loop Off'}
             </button>
          </div>

          {/* 3. MODERN EFFECTS & DOWNLOAD */}
          <div className="flex-1 w-full flex flex-col gap-5">
             {/* Effects */}
             <div className="flex items-center justify-between bg-[#050608]/50 p-3 rounded-2xl border border-white/5 shadow-inner">
                <ControlKnob value={speedKnobValue} onChange={setSpeedKnobValue} label="SPD" color="#a5b4fc" size={48} formatValue={(v) => (0.5 + v * 2).toFixed(1) + 'x'} />
                <ControlKnob value={reverbLevel} onChange={setReverbLevel} label="REV" color="#f472b6" size={48} />
                <ControlKnob value={delayLevel} onChange={setDelayLevel} label="DLY" color="#22d3ee" size={48} />
                <div className="ml-2 pl-2 border-l border-white/10"><ControlKnob value={volume} onChange={setVolume} label="VOL" color="#ffffff" size={56} /></div>
             </div>

             {/* Download */}
             <div className="flex gap-2 h-12">
                <div className="relative flex-1 group">
                     <select value={downloadQuality} onChange={(e) => setDownloadQuality(Number(e.target.value))} className="w-full h-full appearance-none bg-[#0a0c10] border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 focus:outline-none focus:border-emerald-500/50 hover:bg-white/5 transition-all cursor-pointer">
                        <option value={24000}>320 KBPS (Studio)</option>
                        <option value={16000}>256 KBPS (Medium)</option>
                     </select>
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
                </div>
                <button onClick={handleDownload} disabled={isRendering || !lastAudioBase64} className={`flex-[1.5] rounded-xl border flex items-center justify-center gap-2 transition-all duration-300 ${isRendering || !lastAudioBase64 ? 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] group'}`}>
                    {isRendering ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                    <span className="text-[10px] font-black uppercase tracking-widest">Download</span>
                </button>
             </div>
          </div>

        </div>
      </section>
    </div>
  );
};
