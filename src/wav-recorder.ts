// Browser capture for spoken questions. Audio stays in memory, is encoded as the WAV the API
// accepts (PCM16, mono, 16 kHz) and the microphone is released as soon as recording ends.
export const TARGET_RATE = 16000

export function encodeWav(chunks: Float32Array[], inputRate: number): Blob {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const ratio = inputRate / TARGET_RATE
  if (!Number.isFinite(ratio) || ratio < 1) throw new Error('Unsupported capture rate')
  const length = Math.floor(total / ratio)
  const view = new DataView(new ArrayBuffer(44 + length * 2))
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)) }
  text(0, 'RIFF'); view.setUint32(4, 36 + length * 2, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, TARGET_RATE, true); view.setUint32(28, TARGET_RATE * 2, true)
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, length * 2, true)
  const samples = new Float32Array(total)
  let position = 0
  for (const chunk of chunks) { samples.set(chunk, position); position += chunk.length }
  for (let i = 0; i < length; i++) {
    // Average each source window: a simple low-pass before decimation.
    const start = Math.floor(i * ratio), end = Math.max(start + 1, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += samples[j]
    const value = Math.max(-1, Math.min(1, sum / (end - start)))
    view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true)
  }
  return new Blob([view.buffer], { type: 'audio/wav' })
}

export interface WavRecording { stop: () => Blob; cancel: () => void }

export async function startWavRecording(maxSeconds: number, onLimit: () => void): Promise<WavRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
  const context = new AudioContext()
  const source = context.createMediaStreamSource(stream)
  // ScriptProcessor avoids a separate worklet module; capture is short and bounded.
  const processor = context.createScriptProcessor(4096, 1, 1)
  const chunks: Float32Array[] = []
  let captured = 0, open = true
  processor.onaudioprocess = event => {
    if (!open) return
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)))
    captured += event.inputBuffer.length
    if (captured >= context.sampleRate * maxSeconds) onLimit()
  }
  source.connect(processor); processor.connect(context.destination)
  const release = () => {
    open = false
    processor.disconnect(); source.disconnect()
    stream.getTracks().forEach(track => track.stop())
    void context.close()
  }
  return {
    stop: () => {
      release()
      const limit = context.sampleRate * maxSeconds
      let kept = 0
      const bounded = chunks.map(chunk => { const part = chunk.subarray(0, Math.max(0, limit - kept)); kept += part.length; return part })
      return encodeWav(bounded, context.sampleRate)
    },
    cancel: () => { release(); chunks.length = 0 },
  }
}
