import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { GERMAN_VOICES, CLONING_PRESETS } from '../constants';
import { generateSpeech, translateText } from '../services/gemini';
import { decode, decodeAudioData, createWavBlob, encode, audioBufferToWav } from '../utils/audio';
import { CameraScanner } from './CameraScanner';

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

// --- Custom Volume Knob Component ---
const VolumeKnob: React.FC<{ value: number; onChange: (val: number) => void }> = ({ value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  const getClientY = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): number => {
    return 'touches' in e ? (e as any).touches[0].clientY : (e as any).clientY;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    // Only prevent default if it's a touch event to stop scrolling, 
    // but we use CSS touch-action: none as the primary fix.
    setIsDragging(true);
    
    const clientY = getClientY(e);
    startYRef.current = clientY;
    startValueRef.current = value;
    
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      // Prevent page scrolling on mobile while dragging the knob
      if (e.cancelable) {
        e.preventDefault();
      }
      
      const clientY = getClientY(e);
      const deltaY = startYRef.current - clientY;
      
      // Sensitivity: 150px drag = full range
      const change = deltaY / 150; 
      let newValue = startValueRef.current + change;
      newValue = Math.max(0, Math.min(1, newValue));
      onChange(newValue);
    };

    const handleEnd = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove, { passive: false });
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, onChange]);

  // Generate ticks
  const ticks = [];
  const numTicks = 28;
  const startAngle = 135; // Bottom left
  const endAngle = 405;   // Bottom right (270 degree span)
  
  for (let i = 0; i < numTicks; i++) {
    const pct = i / (numTicks - 1);
    const angle = startAngle + (endAngle - startAngle) * pct;
    const rad = (angle * Math.PI) / 180;
    const isLit = value >= pct; // Simple threshold
    
    // Coordinates for ticks (centered at 50,50, radius ~40)
    const innerR = 32;
    const outerR = 42;
    const x1 = 50 + innerR * Math.cos(rad);
    const y1 = 50 + innerR * Math.sin(rad);
    const x2 = 50 + outerR * Math.cos(rad);
    const y2 = 50 + outerR * Math.sin(rad);

    ticks.push(
      <line 
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isLit ? "white" : "#334155"}
        strokeWidth={2}
        strokeLinecap="round"
        className={`transition-colors duration-100 ${isLit ? 'drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]' : ''}`}
      />
    );
  }

  // Indicator dot position
  const knobAngle = startAngle + (endAngle - startAngle) * value;
  const knobRad = (knobAngle * Math.PI) / 180;
  const dotR = 18; // Distance from center for the dot
  const dotX = 50 + dotR * Math.cos(knobRad);
  const dotY = 50 + dotR * Math.sin(knobRad);

  return (
    <div 
      className="relative w-20 h-24 flex flex-col items-center justify-center cursor-ns-resize group select-none"
      style={{ touchAction: 'none' }} // CRITICAL: This allows the custom drag behavior on mobile
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      title="Volume Control (Drag Up/Down)"
    >
      <svg width="80" height="80" viewBox="0 0 100 100">
        {/* Ticks */}
        {ticks}
        
        {/* Knob Body Shadow */}
        <circle cx="50" cy="50" r="26" fill="black" opacity="0.5" filter="blur(2px)" />
        
        {/* Knob Body */}
        <circle 
          cx="50" cy="50" r="25" 
          fill="url(#knobGradient)" 
          stroke="#1e293b" 
          strokeWidth="1"
          className="drop-shadow-lg"
        />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="knobGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* Indicator Dot */}
        <circle 
          cx={dotX} cy={dotY} r="2.5" 
          fill={value > 0 ? "#fff" : "#64748b"} 
          className={value > 0 ? "drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" : ""}
        />
      </svg>
      
      {/* Percentage Text */}
      <div className="absolute bottom-0 text-[9px] font-mono font-bold text-slate-400 group-hover:text-white transition-colors">
        {Math.round(value * 100)}%
      </div>
    </div>
  );
};


export const VoiceStudio: React.FC = () => {
  // State
  const [text, setText] = useState('');
  const [arabicText, setArabicText] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(GERMAN_VOICES[0]);
  const [cloningPersona, setCloningPersona] = useState('');
  const [isCloningMode, setIsCloningMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [downloadQuality, setDownloadQuality] = useState<number>(24000); 
  const [volume, setVolume] = useState(0.85);
  const [showControls, setShowControls] = useState(false); // Default hidden to match screenshot layout
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('deutsch-ki-favorites');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Refs for audio logic
  const audioContextRef = useRef<AudioContext | null>(null);
  const dictationAudioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const previewSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentAudioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const wordTimingsRef = useRef<WordTiming[]>([]);
  const animationFrameRef = useRef<number>(0);
  const liveSessionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for UI
  const overlayRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Critical: Refs to track state inside event listeners
  const isLoopEnabledRef = useRef(isLoopEnabled);
  const isPlayingRef = useRef(isPlaying);

  // Sync refs with state
  useEffect(() => { isLoopEnabledRef.current = isLoopEnabled; }, [isLoopEnabled]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { localStorage.setItem('deutsch-ki-favorites', JSON.stringify(favorites)); }, [favorites]);
  
  // Volume Control Effect
  useEffect(() => {
    if (gainNodeRef.current) {
      // Smooth transition to avoid clicking
      try {
          // Check if context is valid before setting param
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
             gainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.05);
          } else {
             gainNodeRef.current.gain.value = volume;
          }
      } catch (e) {
          gainNodeRef.current.gain.value = volume;
      }
    }
  }, [volume]);

  // Clear word refs when text changes to prevent stale indices
  useEffect(() => { wordRefs.current = []; }, [text]);

  // Auto-scroll effect
  useEffect(() => {
    if (isPlaying && currentWordIndex >= 0 && wordRefs.current[currentWordIndex]) {
      wordRefs.current[currentWordIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentWordIndex, isPlaying]);

  // Cleanup on mount/unmount
  useEffect(() => {
    return () => {
      stopAllAudio(true);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (dictationAudioContextRef.current && dictationAudioContextRef.current.state !== 'closed') {
        dictationAudioContextRef.current.close().catch(() => {});
      }
      if (liveSessionRef.current) {
        Promise.resolve(liveSessionRef.current).then(session => {
          try { session?.close(); } catch {}
        });
      }
      // Reset Media Session
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      }
    };
  }, []);

  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const favoriteVoices = useMemo(() => GERMAN_VOICES.filter(v => favorites.includes(v.id)), [favorites, GERMAN_VOICES]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const stopAllAudio = useCallback((manual: boolean = true) => {
    // Critical: Update ref immediately to prevent race conditions in onended callbacks
    if (manual) isPlayingRef.current = false;

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    
    if (previewSourceNodeRef.current) {
      try { previewSourceNodeRef.current.stop(); } catch (e) {}
      try { previewSourceNodeRef.current.disconnect(); } catch (e) {}
      previewSourceNodeRef.current = null;
    }
    cancelAnimationFrame(animationFrameRef.current);
    
    if (manual) {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      // Clear visualizer
      if (visualizerCanvasRef.current) {
        const ctx = visualizerCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, visualizerCanvasRef.current.width, visualizerCanvasRef.current.height);
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
    setPreviewingVoiceId(null);
  }, []);

  const getAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  // --- Visualizer Logic ---
  const drawVisualizer = () => {
    if (!analyserRef.current || !visualizerCanvasRef.current) return;
    
    const canvas = visualizerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    // Gradient for bars
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#818cf8'); // Indigo 400
    gradient.addColorStop(1, '#22d3ee'); // Cyan 400

    ctx.fillStyle = gradient;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 2; // Scale down slightly
      // Rounded tops
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  };

  // --- Core Audio Logic ---

  const playBuffer = useCallback((buffer: AudioBuffer) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    stopAllAudio(false);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // Create Gain Node for Volume Control
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    gainNodeRef.current = gainNode;

    // Connect Analyser for Visualizer
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    
    // Audio Graph: Source -> Gain -> Analyser -> Destination
    source.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(ctx.destination);
    
    sourceNodeRef.current = source;
    analyserRef.current = analyser;
    startTimeRef.current = ctx.currentTime;
    
    setIsPlaying(true);
    setCurrentWordIndex(-1);
    isPlayingRef.current = true; // Sync ref immediately

    // Setup Media Session (Lock Screen Controls)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: isCloningMode ? 'Voice Clone Audio' : `Deutsch-KI: ${selectedVoice.name}`,
        artist: 'Deutsch-KI Super App',
        album: 'Neural Synthesis',
        artwork: [
          { src: 'https://cdn-icons-png.flaticon.com/512/8804/8804369.png', sizes: '512x512', type: 'image/png' }
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
      navigator.mediaSession.setActionHandler('pause', () => stopAllAudio(true));
      navigator.mediaSession.setActionHandler('stop', () => stopAllAudio(true));
    }
    
    // Animation Loop (Timing + Visualizer)
    const tick = () => {
      if (!ctx || !isPlayingRef.current) return;
      const elapsed = ctx.currentTime - startTimeRef.current;
      const timings = wordTimingsRef.current;
      
      // Update Word Index
      let foundIndex = -1;
      for (let i = 0; i < timings.length; i++) {
        if (elapsed >= timings[i].start && elapsed <= timings[i].end) {
          foundIndex = i;
          break;
        }
      }
      setCurrentWordIndex(foundIndex);

      // Draw Visualizer
      drawVisualizer();

      if (elapsed < buffer.duration + 0.5) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        // Clear visualizer at end
        if (visualizerCanvasRef.current) {
          const c = visualizerCanvasRef.current.getContext('2d');
          c?.clearRect(0, 0, visualizerCanvasRef.current.width, visualizerCanvasRef.current.height);
        }
      }
    };
    animationFrameRef.current = requestAnimationFrame(tick);

    source.start();

    source.onended = () => {
      // Check ref, not just state, to handle rapid stops/unmounts
      if (isLoopEnabledRef.current && isPlayingRef.current) {
        playBuffer(buffer);
      } else {
        setIsPlaying(false);
        setCurrentWordIndex(-1);
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
        }
      }
    };
  }, [stopAllAudio, isCloningMode, selectedVoice.name, volume]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);
    setLastAudioBase64(null);
    currentAudioBufferRef.current = null;
    stopAllAudio(true);

    // Ensure audio context is ready (User Interaction requirement for mobile)
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    try {
      const cloningTarget = isCloningMode && cloningPersona.trim() ? cloningPersona : undefined;
      const base64 = await generateSpeech(text, selectedVoice.geminiVoice, cloningTarget);
      
      setLastAudioBase64(base64);
      
      const audioBuffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
      currentAudioBufferRef.current = audioBuffer;
      
      // Calculate Timings (Linear Approximation)
      const duration = audioBuffer.duration;
      // Filter out whitespace-only strings to count actual words
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
      setError(err.message || 'Synthese fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (e: React.MouseEvent, voice: typeof GERMAN_VOICES[0]) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id) {
      stopAllAudio(true);
      return;
    }

    stopAllAudio(true);
    setPreviewingVoiceId(voice.id);

    try {
      const base64 = await generateSpeech(voice.previewSnippet, voice.geminiVoice);
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const audioBuffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      
      // Connect Preview through Gain Node logic for volume control
      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;
      gainNodeRef.current = gainNode; // Store ref so volume knob works during preview!

      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      previewSourceNodeRef.current = source;
      source.start();
      source.onended = () => setPreviewingVoiceId(null);
    } catch (err) {
      setPreviewingVoiceId(null);
    }
  };

  const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  const handleDownload = () => {
    if (!currentAudioBufferRef.current) return;
    
    // Use the AudioBuffer to allow resampling
    const blob = audioBufferToWav(currentAudioBufferRef.current, downloadQuality);
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Map rate to kbps label for filename
    const kbpsLabel = downloadQuality === 24000 ? '320kbps' : downloadQuality === 16000 ? '256kbps' : '128kbps';
    const voiceLabel = isCloningMode ? 'custom_clone' : sanitizeFilename(selectedVoice.name);
    
    a.download = `deutsch_ki_${voiceLabel}_${kbpsLabel}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!currentAudioBufferRef.current) return;

    try {
      const blob = audioBufferToWav(currentAudioBufferRef.current, downloadQuality);
      const voiceLabel = isCloningMode ? 'custom_clone' : sanitizeFilename(selectedVoice.name);
      const filename = `deutsch_ki_${voiceLabel}_${Date.now()}.wav`;
      
      const file = new File([blob], filename, { type: 'audio/wav' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
            title: 'Deutsch-KI Audio',
            text: `Audio generiert mit Deutsch-KI (${selectedVoice.name})`,
            files: [file]
        });
      } else {
        // Fallback for desktop or non-supported browsers
        handleDownload();
      }
    } catch (err) {
      console.error("Share failed", err);
      // Fallback in case of error (e.g. user cancellation or permission denied)
      setError("Teilen nicht möglich, Download gestartet.");
      handleDownload();
    }
  };

  const handleTranslate = async () => {
    // If active, turn it off
    if (arabicText) {
        setArabicText(null);
        return;
    }

    // If inactive, turn it on
    if (!text.trim()) return;
    setIsTranslating(true);
    setArabicText(null);
    try {
      const translated = await translateText(text);
      setArabicText(translated);
    } catch (err) {
      setError("Übersetzung fehlgeschlagen.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setText(prev => prev ? `${prev}\n${content}` : content);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again if needed
    event.target.value = '';
  };

  const startDictation = async () => {
    if (isDictating) { stopDictation(); return; }
    
    // Close existing context if any to avoid leaks
    if (dictationAudioContextRef.current && dictationAudioContextRef.current.state !== 'closed') {
      await dictationAudioContextRef.current.close().catch(() => {});
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      dictationAudioContextRef.current = audioCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
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
        config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, systemInstruction: 'Transcribe precise German.' },
      });
      // Store the promise immediately so we can close it even if it hasn't resolved yet
      liveSessionRef.current = sessionPromise;
      await sessionPromise;
    } catch (err) { setError("Mikrofon Zugriff verweigert."); setIsDictating(false); }
  };

  const stopDictation = () => {
    try { 
      // Handle both resolved session object and pending promise
      Promise.resolve(liveSessionRef.current).then(session => session?.close()); 
    } catch {}
    if (dictationAudioContextRef.current && dictationAudioContextRef.current.state !== 'closed') {
      dictationAudioContextRef.current.close().catch(() => {});
    }
    setIsDictating(false);
  };

  return (
    <div className="space-y-12 animate-fadeIn max-w-7xl mx-auto font-sans">
      {/* Ghost Animation Style */}
      <style>{`
        @keyframes ghostFloat {
          0%, 100% { transform: translateY(0px); box-shadow: 0 5px 15px rgba(99,102,241,0.2); }
          50% { transform: translateY(-6px); box-shadow: 0 15px 25px rgba(99,102,241,0.4); }
        }
        .ghost-float {
          animation: ghostFloat 3s ease-in-out infinite;
        }
      `}</style>

      {showScanner && (
        <CameraScanner 
          onTextScanned={(t) => setText(p => p ? `${p}\n${t}` : t)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* --- VISION & MANUSCRIPT TERMINAL --- */}
      <section className="relative">
        <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full"></div>
        
        {/* Terminal Header - Collapsible */}
        <div className={`transition-all duration-500 overflow-hidden ${showControls ? 'max-h-64 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="flex flex-col md:flex-row md:items-end justify-between px-2 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] text-emerald-500 font-mono tracking-widest uppercase">System_Online</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">Eingabe Terminal</h3>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
              <div className="flex bg-white/5 rounded-full p-1 border border-white/10 backdrop-blur-md shadow-2xl items-center overflow-x-auto max-w-full no-scrollbar">
                  {/* Dictation Button */}
                  <button 
                      onClick={startDictation} 
                      className={`
                          relative px-3 py-2 rounded-full transition-all duration-300 flex items-center gap-2
                          ${isDictating 
                              ? 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                              : 'text-slate-400 hover:text-white hover:bg-white/10'}
                      `}
                      title="Spracheingabe"
                  >
                      <span className={`w-1.5 h-1.5 rounded-full ${isDictating ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      <span className="text-[9px] font-mono uppercase font-bold hidden sm:inline">{isDictating ? 'REC' : 'MIC'}</span>
                  </button>

                  {/* Vision Scanner Button */}
                  <button 
                      onClick={() => setShowScanner(true)} 
                      className="relative px-3 py-2 rounded-full transition-all duration-300 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/10"
                      title="Vision Scan"
                  >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-indigo-400"></span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className="text-[9px] font-mono uppercase font-bold hidden sm:inline">SCAN</span>
                  </button>

                  {/* File Upload Button */}
                  <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative px-3 py-2 rounded-full transition-all duration-300 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/10"
                      title="Upload Text File"
                  >
                      <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".txt,.md,.json" 
                          onChange={handleFileUpload}
                      />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-indigo-400"></span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span className="text-[9px] font-mono uppercase font-bold hidden sm:inline">UPLOAD</span>
                  </button>

                  <div className="w-px h-5 bg-white/10 mx-1 self-center"></div>

                  {/* Loop Toggle Button */}
                  <button 
                      onClick={() => setIsLoopEnabled(!isLoopEnabled)}
                      className={`
                          relative px-3 py-2 rounded-full transition-all duration-300 flex items-center gap-2
                          ${isLoopEnabled 
                              ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.4)]' 
                              : 'text-slate-400 hover:text-white hover:bg-white/10'}
                      `}
                      title="Toggle Loop Mode"
                  >
                      <span className={`w-1.5 h-1.5 rounded-full ${isLoopEnabled ? 'bg-indigo-500 animate-pulse' : 'bg-slate-600'}`}></span>
                      <svg className={`w-4 h-4 transition-transform duration-500 ${isLoopEnabled ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-[9px] font-mono uppercase font-bold hidden sm:inline">{isLoopEnabled ? 'LOOP:ON' : 'LOOP'}</span>
                  </button>
                  
                  <div className="w-px h-5 bg-white/10 mx-2 self-center"></div>

                  {/* Modern Radial Volume Knob */}
                  <div className="-my-2 scale-75 origin-center shrink-0">
                      <VolumeKnob value={volume} onChange={setVolume} />
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-[#0a0c12]/80 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:border-indigo-500/30">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="relative min-h-[320px] p-6 font-mono text-lg leading-relaxed">
            {/* Toggle Controls Button (Hidden functionality revealer) */}
            <button 
                onClick={() => setShowControls(!showControls)}
                className="absolute top-3 right-3 z-30 p-2 text-slate-700 hover:text-indigo-400 transition-colors opacity-50 hover:opacity-100"
                title={showControls ? "Hide Toolbar" : "Show Toolbar"}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
            </button>

            {/* Visualizer Canvas Overlay */}
            <canvas 
              ref={visualizerCanvasRef} 
              width={800} 
              height={100} 
              className={`absolute bottom-0 left-0 w-full h-32 pointer-events-none transition-opacity duration-500 z-0 ${isPlaying ? 'opacity-30' : 'opacity-0'}`}
            />

            {/* Playback Text Overlay */}
            {isPlaying && (
              <div 
                ref={overlayRef}
                className="absolute inset-0 z-20 bg-[#05070a]/90 backdrop-blur-sm p-6 overflow-y-auto pointer-events-none scroll-smooth scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-transparent"
              >
                <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                  {(() => {
                    let wordCounter = 0;
                    return words.map((part, idx) => {
                      const isWhitespace = /^\s+$/.test(part);
                      const isActive = !isWhitespace && wordCounter === currentWordIndex;
                      const localIndex = wordCounter;

                      if (!isWhitespace) wordCounter++;

                      return (
                        <span 
                          key={`w-${idx}`} 
                          ref={(el) => {
                             if (!isWhitespace && el) {
                               wordRefs.current[localIndex] = el;
                             }
                          }}
                          className={`transition-all duration-150 relative inline-block ${isActive ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 font-bold scale-105 z-10 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'text-slate-600'}`}
                        >
                          {part}
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            <textarea
              className={`w-full h-full min-h-[300px] bg-transparent border-none outline-none resize-none text-slate-300 placeholder-slate-700/50 selection:bg-indigo-500/30 relative z-10 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
              placeholder="// Geben Sie Ihren Text ein oder initialisieren Sie den Scan-Vorgang..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isPlaying}
              spellCheck={false}
            />
          </div>

          {/* Terminal Status Bar */}
          <div className="bg-[#050608] border-t border-white/5 px-4 py-3 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest relative z-30">
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span>Chars: {text.length}</span>
                 </div>
                 {text.length > 0 && <span className="text-slate-700">|</span>}
                 {text.length > 0 && <span>~{(text.length / 15).toFixed(0)} Sec Est.</span>}
             </div>
             
             <div className="flex items-center gap-3">
               <span className={isDictating ? "text-red-400 animate-pulse font-bold" : ""}>{isDictating ? "● RECORDING" : "MIC STANDBY"}</span>
               <span className="w-px h-3 bg-white/10"></span>
               <span className={isPlaying ? "text-indigo-400 animate-pulse font-bold" : ""}>{isPlaying ? "PLAYBACK ACTIVE" : "SYSTEM IDLE"}</span>
             </div>
          </div>
        </div>

        {/* Translation Output Module */}
        {arabicText && (
          <div className="mt-4 relative animate-fadeInUp">
            <div className="bg-[#080a0f] border border-white/5 rounded-2xl p-6 relative overflow-hidden group/trans hover:border-amber-500/30 transition-colors duration-500">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] text-amber-500/80 font-mono tracking-widest uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Translation_Output [Arabic]
                </span>
                <a 
                  href={`https://www.reverso.net/traduction-texte#sl=ger&tl=ara&text=${encodeURIComponent(text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all text-[10px] font-bold tracking-widest uppercase"
                >
                  <span>Verify</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>
              
              <div className="text-2xl text-slate-200 font-light leading-relaxed font-serif" dir="rtl">
                {arabicText}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* --- CONTROL MATRIX --- */}
      <section className="flex flex-col sm:flex-row gap-6">
         {/* Main Generate Button */}
         <button 
           onClick={handleGenerate} 
           disabled={isLoading || !text.trim()} 
           className={`relative flex-[3] group overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all duration-300 ${isLoading || !text.trim() ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-[0_0_50px_rgba(99,102,241,0.2)] hover:-translate-y-1'}`}
         >
           <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-cyan-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           <div className="relative px-8 py-8 flex items-center justify-center gap-8">
             {isLoading ? (
               <>
                 <div className="relative">
                    <div className="w-12 h-12 border-4 border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 w-12 h-12 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                 </div>
                 <div className="flex flex-col text-left">
                    <span className="text-lg font-black text-white tracking-widest uppercase">Processing</span>
                    <span className="text-[10px] text-indigo-400 font-mono">NEURAL_ENGINE_BUSY</span>
                 </div>
               </>
             ) : (
               <>
                 <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                   <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                 </div>
                 <div className="text-left">
                   <div className="text-xl font-black text-white tracking-widest uppercase group-hover:text-indigo-200 transition-colors">{isCloningMode ? 'CLONE & GENERATE' : 'GENERATE AUDIO'}</div>
                   <div className="flex items-center gap-2 mt-1">
                       <span className={`w-2 h-2 rounded-full ${isCloningMode ? 'bg-purple-400' : 'bg-emerald-400'}`}></span>
                       <span className="text-[10px] text-slate-400 font-mono">MODE: {isCloningMode ? 'CUSTOM_PERSONA' : 'STUDIO_VOICE'}</span>
                   </div>
                 </div>
               </>
             )}
           </div>
         </button>

         {/* Playback Controls */}
         <div className="flex-[2] flex gap-4">
            {isPlaying ? (
              <button onClick={() => stopAllAudio(true)} className="flex-1 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all flex flex-col items-center justify-center gap-3 animate-pulse hover:animate-none group">
                <div className="w-5 h-5 rounded bg-current shadow-[0_0_15px_rgba(248,113,113,0.5)] group-hover:shadow-none transition-all"></div>
                <span className="text-[9px] font-black uppercase tracking-widest">Stop</span>
              </button>
            ) : (
                lastAudioBase64 ? (
                <div className="flex-1 flex gap-2">
                    <div className="relative flex-1 group">
                         <select 
                            value={downloadQuality}
                            onChange={(e) => setDownloadQuality(Number(e.target.value))}
                            className="w-full h-full appearance-none bg-[#0a0c10] border border-white/10 rounded-2xl text-[9px] font-bold text-slate-400 uppercase tracking-widest px-4 text-center focus:outline-none focus:border-indigo-500/50 hover:bg-white/5 transition-all cursor-pointer"
                         >
                            <option value={24000}>320 KBPS (Studio)</option>
                            <option value={16000}>256 KBPS (Medium)</option>
                            <option value={8000}>128 KBPS (Draft)</option>
                         </select>
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                         </div>
                    </div>
                    
                    {/* Cloud/Share Button */}
                    <button onClick={handleShare} className="flex-1 rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group" title="Save to Drive / Share">
                        <svg className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">Drive</span>
                    </button>

                    <button onClick={handleDownload} className="flex-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group">
                        <svg className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">Save</span>
                    </button>
                </div>
                ) : (
                  <div className="flex-1 rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-3 opacity-30 cursor-not-allowed">
                      <div className="w-5 h-5 rounded bg-slate-600"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Standby</span>
                  </div>
                )
            )}
         </div>
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center gap-4 text-red-200 animate-shake">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-sm font-mono tracking-wide">{error}</span>
        </div>
      )}

      {/* --- NEURAL VOICE CLONING LAB --- */}
      <section className={`border-b border-white/5 transition-all duration-500 ${isCloningMode ? 'pb-10' : 'pb-4'}`}>
         <div className={`flex items-center justify-between px-2 transition-all duration-500 ${isCloningMode ? 'mb-8' : 'mb-0'}`}>
            <div 
              onClick={() => setIsCloningMode(!isCloningMode)}
              className="cursor-pointer group"
            >
              <h3 className={`font-bold tracking-tight flex items-center gap-3 transition-all duration-300 ${isCloningMode ? 'text-xl text-white' : 'text-sm text-slate-400 group-hover:text-white'}`}>
                 Neural Voice Lab
                 <span className={`bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-1 rounded shadow-lg uppercase tracking-widest text-[8px] flex flex-col items-center leading-none transition-all duration-500 ${isCloningMode ? 'opacity-100 scale-100' : 'opacity-50 scale-75'}`}>
                    <span>BETA</span>
                    <span>ACCESS</span>
                 </span>
              </h3>
              <div className={`overflow-hidden transition-all duration-500 ${isCloningMode ? 'max-h-10 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">ADVANCED PROMPT ENGINEERING & STYLE TRANSFER</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsCloningMode(!isCloningMode)}
              className={`relative rounded-xl border transition-all duration-300 flex items-center gap-3 ${isCloningMode ? 'px-5 py-2.5 bg-indigo-600 border-indigo-400 text-white shadow-[0_0_25px_rgba(99,102,241,0.4)]' : 'px-3 py-1.5 bg-white/5 border-white/10 text-slate-400 hover:border-white/30 hover:bg-white/10'}`}
            >
              <div className={`rounded-full transition-all duration-300 ${isCloningMode ? 'w-2 h-2 bg-white animate-pulse' : 'w-1.5 h-1.5 bg-slate-500'}`}></div>
              <span className={`font-bold tracking-widest uppercase transition-all duration-300 ${isCloningMode ? 'text-xs' : 'text-[10px]'}`}>{isCloningMode ? 'Engine Active' : 'Enable'}</span>
            </button>
         </div>

         <div className={`transition-all duration-700 overflow-hidden ${isCloningMode ? 'max-h-[800px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4'}`}>
            <div className="bg-[#0b0e14] border border-indigo-500/20 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>

              <div className="relative z-10 flex flex-col gap-6 mb-8">
                 <div className="w-full">
                    <label className="flex items-center justify-between text-[10px] text-indigo-300 font-mono uppercase tracking-widest mb-3">
                      <span>Target Voice DNA / Persona Description</span>
                      <span className="text-slate-600">Prompt Length: {cloningPersona.length}/500</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
                      <input 
                        type="text" 
                        value={cloningPersona}
                        onChange={(e) => setCloningPersona(e.target.value)}
                        placeholder='e.g. "A calm, wise narrator with a deep resonant voice like Morgan Freeman"'
                        className="relative w-full bg-[#05070a] border border-white/10 rounded-xl px-5 py-4 text-white placeholder-slate-700 focus:outline-none focus:border-transparent font-mono text-sm shadow-xl"
                      />
                    </div>
                 </div>
              </div>

              {/* CLONING PRESETS GRID */}
              <div>
                <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-4">
                   Quick Select: Celebrity Voice DNA
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {CLONING_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setCloningPersona(`${preset.name}: ${preset.desc}`)}
                      className="text-left p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-[#12141a] transition-all group flex flex-col gap-2 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/0 group-hover:bg-indigo-500 transition-colors"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white truncate">{preset.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 leading-tight line-clamp-2 group-hover:text-slate-400">
                        {preset.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
         </div>
      </section>

      {/* --- ARTIST PROFILES --- */}
      <section className={`transition-all duration-700 ${isCloningMode ? 'opacity-30 grayscale pointer-events-none blur-[2px] scale-95' : 'opacity-100 scale-100'}`}>
        <div className="flex items-end justify-between mb-8 px-2 border-b border-white/5 pb-4">
           <div>
             <h3 className="text-xl font-bold text-white tracking-tight">Künstler Ensemble</h3>
             <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">Select Base Voice Persona</p>
           </div>
           {favoriteVoices.length > 0 && <span className="text-[10px] text-indigo-400 font-mono border border-indigo-500/30 px-2 py-1 rounded bg-indigo-500/10">{favoriteVoices.length} FAVORITES</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {GERMAN_VOICES.map((voice) => {
            const isSelected = selectedVoice.id === voice.id;
            const isPlayingPreview = previewingVoiceId === voice.id;
            const isFavorite = favorites.includes(voice.id);
            
            return (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice)}
                className={`relative group h-full text-left rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between overflow-hidden hover:shadow-2xl hover:-translate-y-1 ${isSelected ? 'bg-gradient-to-b from-[#1a1d26] to-[#0a0c10] border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'bg-[#0a0c10] border-white/5 hover:border-white/20'}`}
              >
                {/* Active Glow */}
                {isSelected && <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${voice.gender === 'male' ? 'bg-cyan-950 text-cyan-400 border border-cyan-900/50' : 'bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-900/50'}`}>
                      {voice.gender === 'male' ? 'Male' : 'Female'}
                    </span>
                    <div className="flex gap-2">
                      <div onClick={(e) => toggleFavorite(e, voice.id)} className={`p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${isFavorite ? 'text-yellow-400' : 'text-slate-700 hover:text-yellow-400'}`}>
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                      </div>
                      <div onClick={(e) => handlePreview(e, voice)} className={`p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer ${isPlayingPreview ? 'text-indigo-400 animate-pulse bg-indigo-500/10' : 'text-slate-600 hover:text-white'}`}>
                        {isPlayingPreview ? (
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <h4 className={`text-lg font-bold mb-1 transition-colors ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{voice.name}</h4>
                  <div className="text-[10px] text-indigo-400 font-mono mb-4 truncate opacity-80">{voice.persona}</div>
                  <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-3 group-hover:text-slate-400 transition-colors">
                    {voice.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};