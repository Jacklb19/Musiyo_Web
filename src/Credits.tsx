import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import { useData } from './exhibition-data'
import { exhibitionCopy as ui } from './exhibition-copy'
import { Status } from './exhibition-ui'

// Closing credits, film style: the list rolls upward by itself and can be paused or read at one's
// own pace. Visitors who prefer reduced motion get the same list, still, with scrolling.
const PIXELS_PER_SECOND = 38

export function Credits() {
  const credits = useData(useCallback((signal: AbortSignal) => api.credits(signal), []))
  const roll = useRef<HTMLDivElement>(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [playing, setPlaying] = useState(!reduced)
  const [ended, setEnded] = useState(false)
  useEffect(() => { document.title = `${ui.creditsTitle} · Musiyo Bëtsknaté` }, [])
  useEffect(() => {
    const element = roll.current
    if (!playing || !element || !credits.data) return
    let frame = 0, last = performance.now(), position = element.scrollTop
    const step = (time: number) => {
      position += (time - last) / 1000 * PIXELS_PER_SECOND
      last = time
      element.scrollTop = position
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 1) { setPlaying(false); setEnded(true); return }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [playing, credits.data])
  useEffect(() => {
    // Reading at one's own pace: any manual scroll pauses the roll.
    const element = roll.current
    if (!element) return
    const pause = () => setPlaying(false)
    element.addEventListener('wheel', pause, { passive: true })
    element.addEventListener('touchstart', pause, { passive: true })
    return () => { element.removeEventListener('wheel', pause); element.removeEventListener('touchstart', pause) }
  }, [credits.data])
  const toggle = () => {
    if (ended && roll.current) { roll.current.scrollTop = 0; setEnded(false) }
    setPlaying(value => !value)
  }
  return <section className="credits-page" aria-labelledby="credits-title">
    <div className="credits-controls">
      <button type="button" className="pill" onClick={toggle}>{playing ? ui.creditsPause : ended ? ui.creditsReplay : ui.creditsPlay}</button>
      <Link className="underlined" to="/">{ui.creditsBack}</Link>
    </div>
    <Status {...credits}/>
    {credits.data && <div className="credits-roll" ref={roll}>
      <div className="credits-track">
        <header><p className="eyebrow">{ui.creditsTitle}</p><h1 id="credits-title">{credits.data.title}</h1><p>{credits.data.subtitle}</p></header>
        {credits.data.sections?.map(section => <section key={section.key} className={`credits-section credits-${section.key}`}>
          <h2>{section.title}</h2>
          <ul>{section.lines.map((line, index) => <li key={index}>{line.role && <span className="credits-role">{line.role}</span>}<span className="credits-name">{line.text}</span></li>)}</ul>
        </section>)}
        <div className="credits-end"><p>{ui.creditsThanks}</p><Link className="pill primary" to="/">{ui.creditsBack}</Link></div>
      </div>
    </div>}
  </section>
}
