import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { api } from './api'

function useApi<T>(load: (signal: AbortSignal) => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setData(null)
    load(controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Error inesperado')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [key])

  return { data, error, loading }
}

function Status({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p className="status" role="status">Cargando contenido autorizado…</p>
  if (error) return <p className="status error" role="alert">{error}</p>
  return null
}

function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Museo virtual · prototipo técnico</p>
          <h1>Musiyo <em>Bëtsknaté</em></h1>
          <p className="lead">Un espacio digital en construcción para consultar contenidos culturales validados y recorrer salas virtuales.</p>
          <div className="actions">
            <Link className="button primary" to="/catalogo">Explorar catálogo <span aria-hidden="true">↗</span></Link>
            <Link className="button secondary" to="/recorrido">Ver recorrido <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="center-mark">M</div></div>
      </section>
      <section className="intro-grid" aria-label="Secciones">
        <article><span className="section-num">01 / Archivo</span><h2>Catálogo</h2><p>Las fichas aparecen cuando cuentan con aprobación cultural y autorización vigente.</p><Link to="/catalogo">Abrir catálogo <span aria-hidden="true">↗</span></Link></article>
        <article><span className="section-num">02 / Experiencia</span><h2>Recorrido</h2><p>La estructura de salas y puntos se consulta desde la API con identificadores compartidos con Unity.</p><Link to="/recorrido">Abrir recorrido <span aria-hidden="true">↗</span></Link></article>
      </section>
    </>
  )
}

function Catalogo() {
  const { data, error, loading } = useApi(api.elementos, 'elementos')
  const [query, setQuery] = useState('')
  const visible = data?.filter((item) => (item.titulo + ' ' + item.descripcion).toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))) || []
  return (
    <section className="page">
      <p className="eyebrow">Archivo / catálogo</p>
      <h1>Elementos publicados</h1>
      <p className="page-intro">Solo se muestran fichas autorizadas por la API.</p>
      <Status loading={loading} error={error} />
      {data && <>
        <label className="search-label" htmlFor="buscar">Buscar en el catálogo</label>
        <input id="buscar" type="search" placeholder="Buscar por título o descripción" value={query} onChange={(event) => setQuery(event.target.value)} />
        {visible.length ? <div className="cards">{visible.map((item, index) => <Link className="card" key={item.id} to={'/elementos/' + encodeURIComponent(item.id)}><span className="section-num">Ficha / {String(index + 1).padStart(2, '0')}</span><h2>{item.titulo}</h2><p>{item.descripcion}</p><span className="card-arrow" aria-hidden="true">↗</span></Link>)}</div> : <div className="empty"><span className="empty-symbol" aria-hidden="true">◇</span><h2>{query ? 'Sin resultados' : 'Aún no hay fichas publicadas'}</h2><p>{query ? 'Prueba con otra búsqueda.' : 'Los contenidos aparecerán aquí después de su aprobación y autorización.'}</p></div>}
      </>}
    </section>
  )
}

function Ficha() {
  const { id = '' } = useParams()
  const { data, error, loading } = useApi((signal) => api.elemento(id, signal), id)
  return <section className="page"><Link className="back" to="/catalogo">← Volver al catálogo</Link><Status loading={loading} error={error} />{data && <article className="ficha"><p className="eyebrow">Archivo / ficha</p><h1>{data.titulo}</h1><p className="lead">{data.descripcion}</p>{data.interpretacion && <section><h2>Interpretación</h2><p>{data.interpretacion}</p></section>}{data.fuentes && <section><h2>Fuentes</h2><p>{data.fuentes}</p></section>}{data.creditos && <section><h2>Créditos</h2><p>{data.creditos}</p></section>}{data.restricciones && <section><h2>Restricciones de uso</h2><p>{data.restricciones}</p></section>}</article>}</section>
}

function RecorridoPage() {
  const recorridoId = 'recorrido-prueba'
  const { data, error, loading } = useApi((signal) => api.recorrido(recorridoId, signal), recorridoId)
  const [params, setParams] = useSearchParams()
  const punto = params.get('punto')
  const elemento = params.get('elemento')
  const validPoint = data?.salas.some((sala) =>
    sala.puntos.some((item) => item.anclajeId === punto && (!elemento || item.elementoIds.includes(elemento)),
  ))
  const unityUrl = import.meta.env.VITE_UNITY_WEBGL_URL || '/unity/index.html'
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [frameSrc, setFrameSrc] = useState('')

  useEffect(() => {
    if (!data || frameSrc) return
    const url = new URL(unityUrl, window.location.href)
    if (url.origin !== window.location.origin) return
    url.searchParams.set('recorrido', data.recorridoId)
    if (punto && validPoint) url.searchParams.set('punto', punto)
    if (elemento && validPoint) url.searchParams.set('elemento', elemento)
    setFrameSrc(url.toString())
  }, [data, frameSrc, unityUrl, punto, elemento, validPoint])

  useEffect(() => {
    function onUnityMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      const message = event.data
      if (!data || !message || message.source !== 'musiyo-unity' ||
        message.type !== 'point-selected' || message.schemaVersion !== 1 ||
        message.recorridoId !== data.recorridoId || typeof message.puntoId !== 'string') return
      const available = data.salas.some((sala) =>
        sala.puntos.some((item) => item.anclajeId === message.puntoId),
      )
      if (!available || (punto === message.puntoId && !elemento)) return
      setParams((current) => {
        const next = new URLSearchParams(current)
        next.set('punto', message.puntoId)
        next.delete('elemento')
        return next
      }, { replace: true })
    }
    window.addEventListener('message', onUnityMessage)
    return () => window.removeEventListener('message', onUnityMessage)
  }, [data, punto, elemento, setParams])

  return <section className="page">
    <p className="eyebrow">Experiencia / recorrido</p>
    <h1>Recorrido virtual</h1>
    <p className="page-intro">La API define qué salas, puntos y elementos autorizados están disponibles.</p>
    <Status loading={loading} error={error} />
    {data && <>
      <div className="recorrido-meta"><span>Contrato v{data.schemaVersion}</span><span>{data.salas.length} sala{data.salas.length === 1 ? '' : 's'}</span></div>
      {punto && !validPoint && <p className="status error" role="alert">El punto o elemento solicitado no está disponible.</p>}
      {frameSrc ? <iframe ref={frameRef} title="Recorrido Unity" className="unity-frame" src={frameSrc} allowFullScreen /> :
        <div className="walkthrough-placeholder"><span aria-hidden="true">◎</span><h2>Recorrido WebGL no configurado</h2><p>El build Unity debe servirse desde el mismo origen que la web.</p></div>}
      <div className="room-list">{data.salas.map((sala) => <article key={sala.id}>
        <span className="section-num">Sala {sala.orden + 1}</span>
        <h2>{sala.id}</h2>
        <ul>{sala.puntos.map((item) => <li key={item.anclajeId}>
          <Link reloadDocument to={'/recorrido?punto=' + encodeURIComponent(item.anclajeId)}>{item.anclajeId}</Link>
          <span>{item.elementoIds.length} elementos disponibles</span>
        </li>)}</ul>
      </article>)}</div>
      {punto && validPoint && data.salas.flatMap((sala) => sala.puntos)
        .filter((item) => item.anclajeId === punto)
        .flatMap((item) => item.elementoIds)
        .map((id) => <p key={id}><Link to={'/elementos/' + encodeURIComponent(id)}>Abrir ficha del elemento {id} ↗</Link></p>)}
    </>}
  </section>
}
function NotFound() {
  return <section className="page"><h1>Página no encontrada</h1><Link to="/">Volver al inicio</Link></section>
}

export default function App() {
  return <div className="site-shell"><header className="site-header"><Link className="brand" to="/" aria-label="Musiyo, ir al inicio"><span className="brand-mark">M</span><span>musiyo<span className="brand-sub"> Bëtsknaté</span></span></Link><nav aria-label="Navegación principal"><NavLink to="/" end>Inicio</NavLink><NavLink to="/catalogo">Catálogo</NavLink><NavLink to="/recorrido">Recorrido</NavLink></nav></header><main><Routes><Route path="/" element={<Home />} /><Route path="/catalogo" element={<Catalogo />} /><Route path="/elementos/:id" element={<Ficha />} /><Route path="/recorrido" element={<RecorridoPage />} /><Route path="*" element={<NotFound />} /></Routes></main><footer><span>Musiyo Bëtsknaté</span><span>Prototipo técnico · contenido sujeto a validación</span></footer></div>
}
