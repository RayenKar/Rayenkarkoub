export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer)
  const frameCount = dataInt16.length / numChannels
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate)

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel)
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0
    }
  }
  return buffer
}

export function createWavBlob(
  pcmData: Uint8Array,
  sampleRate: number
): Blob {
  const buffer = new ArrayBuffer(44 + pcmData.length)
  const view = new DataView(buffer)

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + pcmData.length, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, (sampleRate * 1 * 16) / 8, true)
  view.setUint16(32, (1 * 16) / 8, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, "data")
  view.setUint32(40, pcmData.length, true)

  const pcmUint8 = new Uint8Array(buffer, 44)
  pcmUint8.set(pcmData)

  return new Blob([buffer], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) {
    view.setUint8(offset + i, s.charCodeAt(i))
  }
}

export function audioBufferToWav(
  buffer: AudioBuffer,
  targetSampleRate?: number
): Blob {
  const originalRate = buffer.sampleRate
  const rate = targetSampleRate || originalRate
  const channelData = buffer.getChannelData(0)

  let samples = channelData
  if (rate !== originalRate) {
    const ratio = originalRate / rate
    const newLength = Math.round(samples.length / ratio)
    const newSamples = new Float32Array(newLength)
    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio
      const idx = Math.floor(pos)
      const w = pos - idx
      const p0 = samples[idx]
      const p1 = samples[idx + 1] || p0
      newSamples[i] = p0 * (1 - w) + p1 * w
    }
    samples = newSamples
  }

  const pcmData = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  return createWavBlob(new Uint8Array(pcmData.buffer), rate)
}
