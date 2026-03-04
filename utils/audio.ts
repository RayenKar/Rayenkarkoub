export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Encapsulates raw PCM data into a WAV container for downloading.
 */
export function createWavBlob(pcmData: Uint8Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count (Mono = 1)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * channelCount * bitsPerSample / 8)
  view.setUint32(28, sampleRate * 1 * 16 / 8, true);
  // block align (channelCount * bitsPerSample / 8)
  view.setUint16(32, 1 * 16 / 8, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, pcmData.length, true);

  // write PCM samples
  const pcmUint8 = new Uint8Array(buffer, 44);
  pcmUint8.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts an AudioBuffer to a WAV Blob, optionally resampling it.
 */
export function audioBufferToWav(buffer: AudioBuffer, targetSampleRate?: number): Blob {
  const originalRate = buffer.sampleRate;
  const rate = targetSampleRate || originalRate;
  
  // Assuming mono for simplicity as per app usage
  const channelData = buffer.getChannelData(0); 
  
  let samples = channelData;
  if (rate !== originalRate) {
     // Resample using linear interpolation
     const ratio = originalRate / rate;
     const newLength = Math.round(samples.length / ratio);
     const newSamples = new Float32Array(newLength);
     for (let i = 0; i < newLength; i++) {
       const pos = i * ratio;
       const idx = Math.floor(pos);
       const w = pos - idx;
       const p0 = samples[idx];
       const p1 = samples[idx + 1] || p0;
       newSamples[i] = p0 * (1 - w) + p1 * w;
     }
     samples = newSamples;
  }
  
  // Convert Float32 to Int16
  const pcmData = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  return createWavBlob(new Uint8Array(pcmData.buffer), rate);
}