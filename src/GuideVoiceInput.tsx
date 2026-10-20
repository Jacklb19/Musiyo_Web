import { useEffect, useId, useRef, useState } from 'react'
import { api } from './api'
import type { VoiceCapabilities } from './contracts'
import { voiceCopy } from './voice-copy'
import { startWavRecording, type WavRecording } from './wav-recorder'

export function GuideVoiceInput({ capabilities, consent, disabled, onQuestion }: {
  capabilities: VoiceCapabilities; consent: boolean; disabled: boolean; onQuestion: (text: string) => void
}) {
  const id = useId()
  const controller = useRef<AbortController | null>(null)
  const recording = useRef<WavRecording | null>(null)
  const [recordingState, setRecordingState] = useState<'idle' | 'starting' | 'recording'>('idle')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const microphone = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext
  useEffect(() => () => { controller.current?.abort(); recording.current?.cancel() }, [])

  async function transcribe(audio: Blob | undefined) {
    if (!audio || !consent || pending || disabled) return
    if (audio.size > capabilities.max_input_bytes) { setMessage(voiceCopy.transcriptionError); return }
    const request = new AbortController()
    controller.current = request
    setPending(true); setMessage('')
    try {
      const result = await api.guideTranscription(audio, request.signal)
      if (!request.signal.aborted) { onQuestion(result.text); setMessage(voiceCopy.review) }
    } catch {
      if (!request.signal.aborted) setMessage(voiceCopy.transcriptionError)
    } finally {
      if (!request.signal.aborted) setPending(false)
    }
  }

  function finish() {
    const current = recording.current
    recording.current = null
    setRecordingState('idle')
    if (current) void transcribe(current.stop())
  }

  function discard() {
    recording.current?.cancel()
    recording.current = null
    setRecordingState('idle'); setMessage('')
  }

  async function record() {
    if (!consent || pending || disabled || recordingState !== 'idle') return
    setRecordingState('starting'); setMessage('')
    try {
      recording.current = await startWavRecording(capabilities.max_input_seconds, finish)
      setRecordingState('recording')
    } catch {
      setRecordingState('idle'); setMessage(voiceCopy.microphoneError)
    }
  }

  const busy = !consent || pending || disabled
  return <div>
    {microphone && (recordingState === 'recording'
      ? <p><button type="button" onClick={finish}>{voiceCopy.stop}</button>{' '}
        <button type="button" onClick={discard}>{voiceCopy.discard}</button></p>
      : <p><button type="button" disabled={busy || recordingState === 'starting'} onClick={() => void record()}>
        {voiceCopy.record(capabilities.max_input_seconds)}</button></p>)}
    <label htmlFor={id}>{voiceCopy.upload}</label>
    <input id={id} type="file" accept="audio/wav,.wav" disabled={busy || recordingState !== 'idle'}
      onChange={event => { void transcribe(event.target.files?.[0]); event.target.value = '' }} />
    {pending && <button type="button" onClick={() => { controller.current?.abort(); setPending(false) }}>{voiceCopy.cancel}</button>}
    <output>{recordingState === 'recording' ? voiceCopy.recording : pending ? voiceCopy.transcribing : message}</output>
  </div>
}
