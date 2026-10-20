import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseVoiceAnswer, parseVoiceCapabilities, parseTranscription, voiceRequest, speechBlob } from '../src/voice-client.ts'
const fixture = name => JSON.parse(readFileSync(new URL('../contracts/examples/' + name + '.json', import.meta.url), 'utf8'))

test('additive voice outcomes preserve canonical text and fail closed on audio states', () => {
  const valid = fixture('guide_voice_disabled')
  assert.deepEqual(parseVoiceAnswer(valid), valid)
  assert.deepEqual(parseVoiceAnswer(fixture('guide_voice_unavailable')), fixture('guide_voice_unavailable'))
  assert.equal(speechBlob(valid), null)
  for (const patch of [{schema_version:true}, {audio:{}}, {speech_status:'ready'}, {private_path:'secret'},
    {response:{...valid.response,citations:[]}}, {speech_status:'not_applicable'}]) assert.throws(() => parseVoiceAnswer({...valid,...patch}))
  const ready = {...valid, speech_status:'ready', audio:{mime:'audio/wav',data_base64:'UklGRg=='}}
  assert.ok(speechBlob(parseVoiceAnswer(ready)) instanceof Blob)
  for (const value of ['', 'not base64!', 'a'.repeat(4000001)]) assert.throws(() => parseVoiceAnswer({...ready,audio:{mime:'audio/wav',data_base64:value}}))
})

test('voice capabilities mean configured, never engine or microphone readiness', () => {
  const valid = fixture('voice_capabilities_disabled')
  assert.deepEqual(parseVoiceCapabilities(valid), valid)
  for (const patch of [{transcription:'ready'}, {retention:'permanent'}, {max_input_seconds:31},
    {schema_version:true}, {max_input_bytes:5000001}, {processing:'external'}]) assert.throws(() => parseVoiceCapabilities({...valid,...patch}))
  assert.deepEqual(parseTranscription(fixture('guide_transcription')), fixture('guide_transcription'))
  assert.throws(() => parseTranscription({schema_version:1,text:'  '}))
})

test('voice sends explicit transient-processing consent to backend only and discards cancellation', async () => {
  const body = {schema_version:1,question:'Pregunta sintética'}
  const signal = new AbortController().signal
  const response = await voiceRequest('/api/v1', '/guide/voice-answers', signal, 1000, body, async (url, options) => {
    assert.equal(url,'/api/v1/guide/voice-answers')
    assert.equal(options.headers['X-Musiyo-Voice-Consent'],'request-only-v1')
    assert.equal(options.cache,'no-store')
    assert.deepEqual(JSON.parse(options.body),body)
    return new Response(JSON.stringify(fixture('guide_voice_disabled')))
  })
  assert.equal(parseVoiceAnswer(response).speech_status,'disabled')
  const controller = new AbortController()
  await assert.rejects(voiceRequest('/api/v1','/guide/voice-answers',controller.signal,1000,body, async () => {
    controller.abort()
    return new Response(JSON.stringify(fixture('guide_voice_disabled')))
  }), error => error.name === 'AbortError')
  await assert.rejects(voiceRequest('/api/v1','/guide/transcriptions',signal,1000,new Blob(['test']),async () => new Response('',{status:503})), error => error.status === 503)
})

test('recorded speech is encoded as the bounded WAV accepted by the API', async () => {
  const { encodeWav } = await import('../src/wav-recorder.ts')
  const second = new Float32Array(48000).map((_, i) => Math.sin(i / 10))
  const blob = encodeWav([second.subarray(0, 24000), second.subarray(24000)], 48000)
  const view = new DataView(await blob.arrayBuffer())
  const text = (offset, length) => String.fromCharCode(...new Uint8Array(view.buffer, offset, length))
  assert.equal(blob.type, 'audio/wav')
  assert.equal(text(0, 4), 'RIFF'); assert.equal(text(8, 4), 'WAVE'); assert.equal(text(36, 4), 'data')
  assert.equal(view.getUint16(20, true), 1); assert.equal(view.getUint16(22, true), 1)
  assert.equal(view.getUint32(24, true), 16000); assert.equal(view.getUint16(34, true), 16)
  assert.equal(view.getUint32(40, true), 32000); assert.equal(blob.size, 44 + 32000)
  const clipped = new DataView(await encodeWav([new Float32Array([2, -2])], 16000).arrayBuffer())
  assert.equal(clipped.getInt16(44, true), 0x7fff); assert.equal(clipped.getInt16(46, true), -0x8000)
  assert.throws(() => encodeWav([second], 8000))
})
