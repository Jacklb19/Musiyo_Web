import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { Resource } from './contracts'
import { copy } from './interface-copy'
import { activeCue, parseTimedText } from './timed-text'
import type { Cue } from './timed-text'

export function RecordedAudio({ element, title, resource, subtitles, downloadRestricted }: {
  element: string; title: string; resource: Resource; subtitles: Resource | null; downloadRestricted: boolean
}) {
  const [cues, setCues] = useState<Cue[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed' | 'ready'>(subtitles ? 'loading' : 'idle')
  const [attempt, setAttempt] = useState(0)
  const [follow, setFollow] = useState(false)
  const [current, setCurrent] = useState(-1)
  const [audioFailed, setAudioFailed] = useState(false)
  const [audioAttempt, setAudioAttempt] = useState(0)
  const audio = useRef<HTMLAudioElement>(null)
  const reader = useRef<HTMLDivElement>(null)
  const subtitleId = subtitles?.id
  useEffect(() => {
    const player = audio.current
    return () => { player?.pause() }
  }, [audioAttempt])
  useEffect(() => {
    const controller = new AbortController()
    if (subtitleId) void fetch(api.resourceUrl(element, subtitleId), { signal: controller.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Subtitle access failed'); return response.text() })
      .then(text => {
        const parsed = parseTimedText(text)
        if (parsed.map(cue => cue.text).join(' ').split(/\s+/).join(' ') !== resource.transcription?.trim().split(/\s+/).join(' ')) throw new Error('Transcript differs')
        if (!controller.signal.aborted) { setCues(parsed); setStatus('ready') }
      }).catch(() => { if (!controller.signal.aborted) setStatus('failed') })
    return () => { controller.abort() }
  }, [element, subtitleId, resource.transcription, attempt])
  useEffect(() => {
    const container = reader.current
    const fragment = container?.querySelector<HTMLElement>(`[data-cue="${current}"]`)
    if (follow && container && fragment) {
      // Move only the bounded reader, never the surrounding page or keyboard focus.
      container.scrollTop += fragment.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientHeight / 3
    }
  }, [follow, current])
  if (!resource.transcription) return <p>{copy.media.noAudioTranscript}</p>
  const updateTime = () => setCurrent(activeCue(cues, audio.current?.currentTime ?? 0))
  return <div>
    {/* Visible full transcription remains available when timed text is unavailable. */}
    {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
    <audio key={audioAttempt} ref={audio} controls preload="none" aria-label={copy.media.audioLabel(title, resource.kind === 'narration')}
      controlsList={downloadRestricted ? 'nodownload' : undefined} onTimeUpdate={updateTime} onSeeked={updateTime} onEnded={updateTime}
      onError={() => { setAudioFailed(true); setFollow(false) }}>
      <source src={api.resourceUrl(element, resource.id)} type={resource.mime} />{copy.media.audioUnsupported}
    </audio>
    {audioFailed && <p role="alert">{copy.media.audioFailed} <button type="button" onClick={() => { setAudioFailed(false); setAudioAttempt(value => value + 1) }}>{copy.common.retry}</button></p>}
    {status === 'loading' && <output>{copy.media.cuesLoading}</output>}
    {status === 'failed' && <p>{copy.media.cuesUnavailable} <button type="button" onClick={() => { setStatus('loading'); setAttempt(value => value + 1) }}>{copy.common.retry}</button></p>}
    {status === 'ready' && <>
      <label className="reading-follow"><input type="checkbox" checked={follow} onChange={event => { setFollow(event.target.checked); updateTime() }} />{copy.media.followAudio}</label>
      {/* A bounded scroll reader needs keyboard access; these handlers only yield automatic scrolling. */}
      {/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions */}
      <section className="timed-reading" ref={reader} tabIndex={0} aria-label={copy.media.timedReading}
        onWheel={() => setFollow(false)} onTouchStart={() => setFollow(false)} onPointerDown={() => setFollow(false)}
        onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) setFollow(false) }}>
        {cues.map((cue, index) => <p key={index} data-cue={index} aria-current={index === current ? 'true' : undefined}>{cue.text}</p>)}
      </section>
      {/* oxlint-enable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions */}
    </>}
    <details><summary>{copy.detail.transcription}</summary><p>{resource.transcription}</p></details>
  </div>
}
