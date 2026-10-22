import { pageTitle } from './page-titles'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const positions = new Map<string, number>()

export function PageLifecycle() {
  const location = useLocation()
  const navigation = useNavigationType()
  const previousPath = useRef('')
  const focusPath = useRef(location.pathname)
  useLayoutEffect(() => {
    const restore = navigation === 'POP' || location.state?.restoreCatalog
    const samePage = previousPath.current === location.pathname
    previousPath.current = location.pathname
    const target = restore ? positions.get(location.key) ?? positions.get(location.pathname + location.search) ?? 0 : samePage ? window.scrollY : 0
    let stopped = false
    const observer = new ResizeObserver(attemptRestore)
    function stop() { stopped = true; observer.disconnect() }
    function attemptRestore() {
      if (stopped) return
      let anchorId = location.hash.slice(1)
      try { anchorId = decodeURIComponent(anchorId) } catch { /* Keep malformed fragments inert. */ }
      const anchor = anchorId ? document.getElementById(anchorId) : null
      if (anchor) { anchor.scrollIntoView(); stop() }
      else if (!location.hash && document.documentElement.scrollHeight - innerHeight >= target) {
        window.scrollTo({ top: target, behavior: 'instant' }); stop()
      }
    }
    observer.observe(document.documentElement)
    const frame = requestAnimationFrame(attemptRestore)
    const timer = setTimeout(stop, 30000)
    const events = ['wheel', 'pointerdown', 'keydown'] as const
    for (const event of events) window.addEventListener(event, stop, { once: true })
    return () => {
      stop(); cancelAnimationFrame(frame); clearTimeout(timer)
      for (const event of events) window.removeEventListener(event, stop)
      positions.set(location.key, window.scrollY)
      positions.set(location.pathname + location.search, window.scrollY)
      if (positions.size > 100) positions.delete(positions.keys().next().value!)
    }
  }, [location.key, location.pathname, location.search, location.hash, location.state, navigation])
  useEffect(() => {
    const changedPage = focusPath.current !== location.pathname
    focusPath.current = location.pathname
    if (changedPage && navigation !== 'POP') document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })
    document.title = pageTitle(location.pathname)
  }, [location.pathname, navigation])
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target) }
    }, { threshold: 0.06 })
    const chapters = [...document.querySelectorAll('.section-shell')]
    for (const chapter of chapters) {
      if (chapter.getBoundingClientRect().top < innerHeight) continue
      chapter.classList.add('chapter-reveal')
      observer.observe(chapter)
    }
    return () => { observer.disconnect(); for (const chapter of chapters) chapter.classList.remove('chapter-reveal', 'is-revealed') }
  }, [location.pathname])
  return null
}
