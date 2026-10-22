import { Credits } from './Credits'
import { VisitQuiz } from './VisitQuiz'
import { ExhibitionHome, ExhibitionCollection, ExhibitionDetail, VisitPreparation, PublicShell, PageLifecycle } from './Exhibition'
import { useCallback, useEffect, useState } from 'react'
import { Link, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from './api'
import { parseSelection, parseClearedSelection, parsePointPresence, parseReturnToCatalog } from './contract-validation'
import { UnityTour, type UnityInstance } from './UnityTour'
import { confirmedSelection, isAvailableSelection, presenceForSelection } from './tour-selection'
import { useApi } from './use-api'
import type { PointPresence } from './contracts'
import { Validator } from './Validator'
import { ValidatorSessionProvider } from './validator-session'
import { Guide } from './Guide'
import { copy } from './interface-copy'
import { presentation } from './presentation-config'

function Status({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <output className="status">{copy.common.loading}</output>
  if (error) return <p className="status error" role="alert">{error}</p>
  return null
}

// Visitors know a point by what it shows, not by its internal number ("Punto 1").
function pointLabel(point: { name: string; elements: { title: string }[] }) {
  return point.elements.length ? point.elements.map(item => item.title).join(' · ') : point.name
}

function TourPage() {
  const tourKey = presentation.tourKey
  const [attempt, setAttempt] = useState(0)
  const load = useCallback((signal: AbortSignal) => { void attempt; return api.tour(tourKey, signal) }, [tourKey, attempt])
  const { data, error, loading } = useApi(load)
  const [params, setParams] = useSearchParams()
  const point = params.get('point')
  const element = params.get('element')
  const validPoint = !!data && isAvailableSelection(data, point, element)
  const selectedPoint = validPoint ? data?.rooms.flatMap(room => room.points).find(item => item.key === point) : null
  const selectedElement = element ? selectedPoint?.elements.find(item => item.slug === element) : null
  const [instance, setInstance] = useState<UnityInstance | null>(null)
  const [desktopAvailable, setDesktopAvailable] = useState(false)
  const navigate = useNavigate()
  // The last report is kept as received and matched while rendering: Unity can send it before the
  // address shows the point it describes. Unity only reports changes and every activated point starts
  // near, so a report about another point is dropped as soon as the shown point changes.
  const [report, setReport] = useState<PointPresence | null>(null)
  const [reportedPoint, setReportedPoint] = useState(point)
  if (reportedPoint !== point) {
    setReportedPoint(point)
    if (report && report.data.point_key !== point) setReport(null)
  }
  const away = !!data && !!report && presenceForSelection(report, data.tour.key, validPoint ? point : null) === 'away'
  const onEngine = useCallback((engine: UnityInstance | null) => {
    setInstance(engine)
    if (!engine) setReport(null)
  }, [])

  useEffect(() => {
    function onPresence(event: Event) {
      const message = parsePointPresence((event as CustomEvent<unknown>).detail)
      if (data && instance && message?.data.tour_key === data.tour.key) setReport(message)
    }
    window.addEventListener('musiyo:presence', onPresence)
    return () => window.removeEventListener('musiyo:presence', onPresence)
  }, [data, instance])

  useEffect(() => {
    // Unity only asks; the page performs the navigation at the end of the suggested route.
    function onNavigation(event: Event) {
      const message = parseReturnToCatalog((event as CustomEvent<unknown>).detail)
      if (data && instance && message?.data.tour_key === data.tour.key) navigate('/catalogo', { state: { visitCompleted: true } })
    }
    window.addEventListener('musiyo:navigation', onNavigation)
    return () => window.removeEventListener('musiyo:navigation', onNavigation)
  }, [data, instance, navigate])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
    const update = () => {
      const probe = document.createElement('canvas')
      const context = media.matches ? probe.getContext('webgl2') : null
      setDesktopAvailable(!!context)
      context?.getExtension('WEBGL_lose_context')?.loseContext()
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    function onSelection(event: Event) {
      const cleared = parseClearedSelection((event as CustomEvent<unknown>).detail)
      if (data && instance && cleared?.data.tour_key === data.tour.key) {
        setReport(null)
        setParams((current) => {
          const next = new URLSearchParams(current)
          next.delete('point'); next.delete('element')
          return next.toString() === current.toString() ? current : next
        }, { replace: true })
        return
      }
      const message = parseSelection((event as CustomEvent<unknown>).detail)
      if (!data || !instance || !message) return
      const selection = confirmedSelection(data, message)
      if (!selection) return
      setParams((current) => {
        const next = new URLSearchParams(current)
        next.set('tour', selection.get('tour')!)
        next.set('point', selection.get('point')!)
        if (selection.has('element')) next.set('element', selection.get('element')!)
        else next.delete('element')
        return next.toString() === current.toString() ? current : next
      }, { replace: true })
    }
    window.addEventListener('musiyo:selection', onSelection)
    return () => window.removeEventListener('musiyo:selection', onSelection)
  }, [data, instance, setParams])

  // Unity can confirm a selection synchronously, so its listener must already use the current engine.
  useEffect(() => {
    if (!instance || !data) return
    const query = new URLSearchParams({ tour: data.tour.key })
    if (validPoint) query.set('point', point!)
    if (validPoint && element) query.set('element', element)
    instance.SendMessage('MuseumBlockout', 'ApplySelection', query.toString())
  }, [instance, data, point, element, validPoint])

  return <section className="page tour-page">
    <div className="section-heading"><div><p className="eyebrow">{copy.tour.eyebrow}</p>
    <h1>{copy.tour.title}</h1><p className="page-intro">{copy.tour.intro}</p></div><Link className="button secondary" to="/catalogo">{copy.tour.catalog} <span aria-hidden="true">↗</span></Link></div>
    <Status loading={loading} error="" />
    {error && <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>{copy.common.retry}</button></p>}
    {data && <>
      {point && !validPoint && <p className="status error" role="alert">{copy.tour.unavailable}</p>}
      {desktopAvailable ? <UnityTour onReady={onEngine} /> : <div className="tour-alternative"><p>{copy.tour.mobile}</p><Link className="button primary" to="/recorrido/texto">{copy.tour.text} <span aria-hidden="true">→</span></Link></div>}
      {selectedPoint && <section className="point-selection" aria-labelledby="point-selection-title"><p className="eyebrow">{copy.tour.selection}</p><h2 id="point-selection-title">{selectedPoint.name}</h2><label>{copy.tour.choose}<select value={element || ''} onChange={event => setParams(current => {
        const next = new URLSearchParams(current)
        if (event.target.value) next.set('element', event.target.value)
        else next.delete('element')
        return next
      })}><option value="">{copy.tour.choose}</option>{selectedPoint.elements.map(item => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>
      {element ? <Link className="button secondary" to={'/elementos/' + encodeURIComponent(element)}>{copy.tour.openDetail} <span aria-hidden="true">↗</span></Link> : <p>{copy.tour.noSelection}</p>}
      <output className="point-presence">{away ? (selectedElement?.has_narration ? copy.tour.awayNarrated : copy.tour.away) : ''}</output></section>}
      <div className="section-heading room-heading"><div><h2>{copy.tour.rooms}</h2><p>{copy.tour.roomHint}</p></div><Link to="/recorrido/texto">{copy.tour.text} <span aria-hidden="true">→</span></Link></div>
      <div className="room-list">{data.rooms.map((room) => <article key={room.key}>
        <span className="section-num">{copy.tour.room} {String(room.order + 1).padStart(2, '0')}</span><h3>{room.name}</h3>
        {room.points.some(item => item.elements.length > 0)
          ? <ul>{room.points.filter(item => item.elements.length > 0).map((item) => <li key={item.key}>
            <Link to={'/recorrido?point=' + encodeURIComponent(item.key)}>{pointLabel(item)}</Link>
            <span>{copy.tour.count(item.elements.length)}</span>
          </li>)}</ul>
          : <p className="room-only-3d">{copy.tour.roomOnly3d}</p>}
      </article>)}</div>
    </>}
  </section>
}

function About() {
  return <section className="page"><p className="eyebrow">Acerca del museo</p><h1>Musiyo Bëtsknaté</h1>
    <div className="ficha"><p className="lead">Un museo virtual para explorar contenidos sobre el Carnaval del Perdón del Valle de Sibundoy.</p>
      <section><h2>Una visita libre</h2><p>Puedes elegir tu propio camino, volver a una sala y consultar las fichas. La ruta sugerida pasa por Llegada, Bienvenida, Personajes, Instrumentos y Danza, Fogón y Mirador.</p></section>
      <section><h2>Fuentes y créditos</h2><p>Cada ficha presenta sus fuentes, créditos y restricciones disponibles. Los testimonios, la información documentada y las interpretaciones se muestran por separado. Las referencias a los pueblos Kamëntsá e Inga conservan su identificación propia.</p></section>
      <section><h2>Formas de explorar</h2><p>El catálogo y las fichas pueden consultarse en computador y celular. El recorrido 3D requiere un computador con WebGL 2; <Link to="/recorrido/texto">la alternativa en texto</Link> permite explorar las salas sin cargar el entorno 3D.</p></section>
    </div>
  </section>
}

function Privacy() {
  return <section className="page"><p className="eyebrow">Privacidad</p><h1>Tu visita y tus datos</h1>
    <div className="ficha"><p className="lead">Puedes consultar el catálogo, las fichas y el recorrido público sin crear una cuenta.</p>
      <section><h2>Guía y micrófono</h2><p>El guía busca la respuesta solo en las fichas autorizadas del museo. Para redactarla, tu pregunta y los fragmentos de fichas encontrados pueden enviarse a Groq, un servicio externo de inteligencia artificial; si no está disponible, el guía cita directamente el texto de la ficha. Si usas la voz, se te pedirá aceptación antes de activar el micrófono y se indicará qué servicios procesan el audio (Groq para entender la pregunta y ElevenLabs para la voz de la respuesta, cuando estén activos). Siempre puedes escribir tu pregunta.</p></section>
      <section><h2>Contenido y archivos</h2><p>Los créditos y restricciones de uso se indican en cada ficha. Poder consultar un material no implica permiso para reutilizarlo.</p></section>
      <section><h2>Voces sintéticas</h2><p>Las respuestas habladas del guía usan una voz de ElevenLabs. Cuando ese servicio no está disponible, el museo usa en su propio servidor el modelo de voz Piper «daniela» (larcanio), entrenado con el <a href="https://www.openslr.org/61/" rel="noopener noreferrer" target="_blank">conjunto de habla del español de Argentina de OpenSLR (SLR61, Guevara-Rukoz y otros, 2020)</a>, publicado bajo licencia <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" rel="noopener noreferrer" target="_blank">CC BY-SA 4.0</a>. Las narraciones de las fichas indican su propio crédito.</p></section>
      <section><h2>Servicios externos y conservación</h2><p>El museo no guarda tus preguntas, tus grabaciones ni las respuestas, y no las añade al catálogo. Los servicios externos aplican sus propias condiciones de tratamiento: Groq (groq.com) y ElevenLabs (elevenlabs.io). No incluyas datos personales en tus preguntas.</p></section>
    </div>
  </section>
}

function NotFound() {
  return <section className="page"><h1>Página no encontrada</h1><Link to="/">Volver al inicio</Link></section>
}

export default function App() {
  return <ValidatorSessionProvider><PageLifecycle/><PublicShell><Routes>
    <Route path="/" element={<ExhibitionHome/>}/>
    <Route path="/catalogo" element={<ExhibitionCollection/>}/>
    <Route path="/elementos/:id" element={<ExhibitionDetail/>}/>
    <Route path="/recorrido" element={<div className="legacy-content"><TourPage/></div>}/>
    <Route path="/recorrido/texto" element={<VisitPreparation/>}/>
    <Route path="/recorrido/cierre" element={<section className="page-shell"><VisitQuiz heading="h1"/></section>}/>
    <Route path="/guia" element={<div className="legacy-content"><Guide/></div>}/>
    <Route path="/acerca" element={<div className="legacy-content"><About/></div>}/>
    <Route path="/privacidad" element={<div className="legacy-content"><Privacy/></div>}/>
    <Route path="/creditos" element={<Credits/>}/>
    <Route path="/validador" element={<div className="legacy-content"><Validator/></div>}/>
    <Route path="/validador/:id" element={<div className="legacy-content"><Validator/></div>}/>
    <Route path="*" element={<div className="legacy-content"><NotFound/></div>}/>
  </Routes></PublicShell></ValidatorSessionProvider>
}
