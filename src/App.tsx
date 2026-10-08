import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from './api'
import { parseSelection, parseClearedSelection, parseReturnToCatalog } from './contract-validation'
import { UnityTour, type UnityInstance } from './UnityTour'
import { confirmedSelection, isAvailableSelection } from './tour-selection'
import { useApi } from './use-api'
import { Catalog } from './Catalog'
import { Detail } from './Detail'
import { Validator } from './Validator'
import { ValidatorSessionProvider } from './validator-session'
import { Home } from './Home'
import { copy } from './interface-copy'
import { presentation } from './presentation-config'

function Status({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <output className="status">{copy.common.loading}</output>
  if (error) return <p className="status error" role="alert">{error}</p>
  return null
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
  const [instance, setInstance] = useState<UnityInstance | null>(null)
  const [desktopAvailable, setDesktopAvailable] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Unity only asks; the page performs the navigation at the end of the suggested route.
    function onNavigation(event: Event) {
      const message = parseReturnToCatalog((event as CustomEvent<unknown>).detail)
      if (data && instance && message?.data.tour_key === data.tour.key) navigate('/catalogo')
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
    if (!instance || !data) return
    const query = new URLSearchParams({ tour: data.tour.key })
    if (validPoint) query.set('point', point!)
    if (validPoint && element) query.set('element', element)
    instance.SendMessage('MuseumBlockout', 'ApplySelection', query.toString())
  }, [instance, data, point, element, validPoint])

  useEffect(() => {
    function onSelection(event: Event) {
      const cleared = parseClearedSelection((event as CustomEvent<unknown>).detail)
      if (data && instance && cleared?.data.tour_key === data.tour.key) {
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

  return <section className="page tour-page">
    <div className="section-heading"><div><p className="eyebrow">{copy.tour.eyebrow}</p>
    <h1>{copy.tour.title}</h1><p className="page-intro">{copy.tour.intro}</p></div><Link className="button secondary" to="/catalogo">{copy.tour.catalog} <span aria-hidden="true">↗</span></Link></div>
    <Status loading={loading} error="" />
    {error && <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>{copy.common.retry}</button></p>}
    {data && <>
      {point && !validPoint && <p className="status error" role="alert">{copy.tour.unavailable}</p>}
      {desktopAvailable ? <UnityTour onReady={setInstance} /> : <div className="tour-alternative"><p>{copy.tour.mobile}</p><Link className="button primary" to="/recorrido/texto">{copy.tour.text} <span aria-hidden="true">→</span></Link></div>}
      {selectedPoint && <section className="point-selection" aria-labelledby="point-selection-title"><p className="eyebrow">{copy.tour.selection}</p><h2 id="point-selection-title">{selectedPoint.name}</h2><label>{copy.tour.choose}<select value={element || ''} onChange={event => setParams(current => {
        const next = new URLSearchParams(current)
        if (event.target.value) next.set('element', event.target.value)
        else next.delete('element')
        return next
      })}><option value="">{copy.tour.choose}</option>{selectedPoint.elements.map(item => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>
      {element ? <Link className="button secondary" to={'/elementos/' + encodeURIComponent(element)}>{copy.tour.openDetail} <span aria-hidden="true">↗</span></Link> : <p>{copy.tour.noSelection}</p>}</section>}
      {validPoint && element && <div id="selected-element" className="tour-detail"><Detail elementId={element} /></div>}
      <div className="section-heading room-heading"><div><h2>{copy.tour.rooms}</h2><p>{copy.tour.roomHint}</p></div><Link to="/recorrido/texto">{copy.tour.text} <span aria-hidden="true">→</span></Link></div>
      <div className="room-list">{data.rooms.map((room) => <article key={room.key}>
        <span className="section-num">{copy.tour.room} {String(room.order + 1).padStart(2, '0')}</span><h3>{room.name}</h3>
        <ul>{room.points.map((item) => <li key={item.key}>
          <Link to={'/recorrido?point=' + encodeURIComponent(item.key)}>{item.name}</Link>
          <span>{copy.tour.count(item.elements.length)}</span>
        </li>)}</ul>
      </article>)}</div>
    </>}
  </section>
}

function TextTour() {
  const tourKey = presentation.tourKey
  const [attempt, setAttempt] = useState(0)
  const load = useCallback((signal: AbortSignal) => { void attempt; return api.tour(tourKey, signal) }, [tourKey, attempt])
  const { data, error, loading } = useApi(load)
  return <section className="page text-tour">
    <p className="eyebrow">{copy.tour.textEyebrow}</p><h1>{copy.tour.textTitle}</h1>
    <p className="page-intro">{copy.tour.textIntro}</p><Link className="back" to="/catalogo">{copy.common.backCatalog}</Link>
    <Status loading={loading} error="" />
    {error && <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>{copy.common.retry}</button></p>}
    {data && <>
      <nav aria-label={copy.tour.roomNavigation} className="room-index">
        {data.rooms.map((room, index) => <a key={room.key} href={'#room-' + index}>{room.name}</a>)}
      </nav>
      {data.rooms.map((room, index) => <section key={room.key} id={'room-' + index} className="text-room" aria-labelledby={'room-title-' + index}>
        <h2 id={'room-title-' + index}>{room.name}</h2>
        {room.short_description && <p>{room.short_description}</p>}
        <ol>{room.points.map((point) => <li key={point.key}>
          <h3>{point.name}</h3>
          {point.elements.length ? <ul>{point.elements.map((element) => <li key={element.slug}>
            <Link to={'/elementos/' + encodeURIComponent(element.slug)}>{element.title}</Link>
            {element.has_narration && <> · <Link to={'/elementos/' + encodeURIComponent(element.slug) + '#narrations'}>{copy.tour.readNarration}</Link></>}
          </li>)}</ul> : <p>{copy.tour.noContent}</p>}
        </li>)}</ol>
        <a href="#main-content">{copy.tour.top}</a>
      </section>)}
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
      <section><h2>Micrófono y guía</h2><p>La consulta por voz está en desarrollo. Cuando esté disponible, se solicitará tu aceptación antes de activar el micrófono y se identificará el servicio externo que procesa el audio. También podrás escribir tu pregunta.</p></section>
      <section><h2>Contenido y archivos</h2><p>Los créditos y restricciones de uso se indican en cada ficha. Poder consultar un material no implica permiso para reutilizarlo.</p></section>
      <section><h2>Servicios externos</h2><p>Las funciones de voz y asistencia pueden utilizar servicios externos. Su información de tratamiento y conservación deberá estar disponible antes de habilitarlas.</p></section>
    </div>
  </section>
}

function NotFound() {
  return <section className="page"><h1>Página no encontrada</h1><Link to="/">Volver al inicio</Link></section>
}

export default function App() {
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0)
      document.getElementById('main-content')?.focus({ preventScroll: true })
    }
  }, [location.pathname, location.hash])
  return <ValidatorSessionProvider><div className="site-shell" data-tone={location.pathname === '/' ? 'dark' : 'light'}>
    <a className="skip-link" href="#main-content">{copy.site.skip}</a>
    <header className="site-header"><Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">MB</span><span>{copy.site.name}<span className="brand-sub">{copy.site.subtitle}</span></span></Link>
      <nav aria-label={copy.site.navigation}><NavLink to="/" end>{copy.site.home}</NavLink><NavLink to="/catalogo">{copy.site.catalog}</NavLink><NavLink to="/recorrido">{copy.site.tour}</NavLink></nav>
    </header>
    <main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<Home />} /><Route path="/catalogo" element={<Catalog />} /><Route path="/elementos/:id" element={<Detail />} /><Route path="/recorrido" element={<TourPage />} /><Route path="/recorrido/texto" element={<TextTour />} /><Route path="/acerca" element={<About />} /><Route path="/privacidad" element={<Privacy />} /><Route path="/validador" element={<Validator />} /><Route path="/validador/:id" element={<Validator />} /><Route path="*" element={<NotFound />} /></Routes></main>
    <footer><div><span className="footer-brand">{copy.site.name}</span><p>{copy.site.subtitle}</p></div><nav aria-label={copy.site.information}><Link to="/validador">{copy.site.validators}</Link><Link to="/acerca">{copy.site.about}</Link><Link to="/privacidad">{copy.site.privacy}</Link><Link to="/recorrido/texto">{copy.home.textTour}</Link></nav></footer>
  </div></ValidatorSessionProvider>
}
