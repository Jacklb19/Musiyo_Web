import { exhibitionCopy as ui } from './exhibition-copy'
import { useEffect, useId, useRef, useState } from 'react'
import { api } from './api'
import type { Resource } from './contracts'
import { copy } from './interface-copy'
import { activeCue, parseTimedText } from './timed-text'
import type { Cue } from './timed-text'

function seekAudio(player: HTMLAudioElement | null, seconds: number) {
  if (player) player.currentTime = seconds
}

export function RecordedAudio({ element, title, resource, subtitles, downloadRestricted, appearance = 'native' }: {
  element: string; title: string; resource: Resource; subtitles: Resource | null; downloadRestricted: boolean; appearance?: 'native' | 'exhibition'
}) {
  const seekId = useId()
  const [playing, setPlaying] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [canSeek, setCanSeek] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(resource.duration_seconds || 0)
  function formatTime(value: number) { const safe = Number.isFinite(value) && value > 0 ? value : 0; return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, '0')}` }
  async function togglePlayback() {
    if (!audio.current) return
    if (!audio.current.paused) audio.current.pause()
    else {
      setAudioFailed(false); setWaiting(true)
      try { await audio.current.play() } catch { setWaiting(false); setAudioFailed(true) }
    }
  }
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
  const updateTime = () => { setTime(audio.current?.currentTime ?? 0); setCurrent(activeCue(cues, audio.current?.currentTime ?? 0)) }
  return <div className={appearance === 'exhibition' ? 'narration' : undefined}>
    {/* Visible full transcription remains available when timed text is unavailable. */}
    {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
    <audio key={audioAttempt} ref={audio} controls={appearance === 'native'} preload="none" aria-label={copy.media.audioLabel(title, resource.kind === 'narration')}
      controlsList={downloadRestricted ? 'nodownload' : undefined} onTimeUpdate={updateTime} onSeeked={updateTime} onEnded={() => { setPlaying(false); setWaiting(false); updateTime() }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onPlaying={() => setWaiting(false)}
      onWaiting={() => setWaiting(true)} onCanPlay={() => setWaiting(false)}
      onLoadedMetadata={() => { const value = audio.current?.duration || 0; setDuration(Number.isFinite(value) ? value : 0); setCanSeek(true) }}
      onError={() => { setAudioFailed(true); setFollow(false); setPlaying(false); setWaiting(false) }}>
      <source src={api.resourceUrl(element, resource.id)} type={resource.mime} />{copy.media.audioUnsupported}
    </audio>
    {appearance === 'exhibition' && <div className="audio-main">
      <button type="button" className="circle play" aria-label={`${playing ? ui.pause : ui.listen} ${title}`} disabled={waiting && !playing} onClick={() => void togglePlayback()}>{waiting && !playing ? '…' : playing ? 'Ⅱ' : '▶'}</button>
      <div className="audio-info"><span className="eyebrow">{copy.common.narration}</span><strong>{title}</strong>
        <label className="sr-only" htmlFor={seekId}>{ui.seekNarration}</label>
        <input id={seekId} type="range" min="0" max={duration || 1} value={Math.min(time, duration || 1)} step="any" aria-valuetext={`${formatTime(time)} de ${formatTime(duration)}`} disabled={!canSeek || !duration} onChange={event => { seekAudio(audio.current, Number(event.target.value)); updateTime() }}
          onKeyDown={event => {
            // Arrow keys move five seconds; the native step would move a tenth of a second.
            const shift = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 }[event.key]
            if (!shift) return
            event.preventDefault(); seekAudio(audio.current, Math.max(0, Math.min(duration, time + shift))); updateTime()
          }}/>
      </div><span className="audio-time">{formatTime(time)} <span>/ {formatTime(duration)}</span></span>
    </div>}
    {audioFailed && <p role="alert">{copy.media.audioFailed} <button type="button" className="text-button" onClick={() => { setAudioFailed(false); setWaiting(false); setPlaying(false); setCanSeek(false); setTime(0); setAudioAttempt(value => value + 1) }}>{copy.common.retry}</button></p>}
    {status === 'loading' && <output>{copy.media.cuesLoading}</output>}
    {status === 'failed' && <p>{copy.media.cuesUnavailable} <button type="button" className="text-button" onClick={() => { setStatus('loading'); setAttempt(value => value + 1) }}>{copy.common.retry}</button></p>}
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
    {/* The synchronized reader already shows the whole text; the plain transcript is its fallback. */}
    {status !== 'ready' && <details className={appearance === 'exhibition' ? 'transcript' : undefined}><summary>{copy.detail.transcription}</summary><p>{resource.transcription}</p></details>}
  </div>
}
