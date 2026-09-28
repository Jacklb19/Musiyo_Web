import { useEffect, useState } from 'react'
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
  const { data, error, loading } = useApi((signal) => api.recorrido('recorrido-prueba', signal), 'recorrido-prueba')
  const [params] = useSearchParams()
  const punto = params.get('punto')
  const elemento = params.get('elemento')
  const validPoint = data?.salas.some((sala) => sala.puntos.some((item) => item.anclajeId === punto && (!elemento || item.elementoIds.includes(elemento))))
  const unityUrl = import.meta.env.VITE_UNITY_WEBGL_URL
  return <section className="page"><p className="eyebrow">Experiencia / recorrido</p><h1>Recorrido virtual</h1><p className="page-intro">La API define qué salas, puntos y elementos autorizados están disponibles.</p><Status loading={loading} error={error} />{data && <><div className="recorrido-meta"><span>Contrato v{data.schemaVersion}</span><span>{data.salas.length} sala{data.salas.length === 1 ? '' : 's'}</span></div>{punto && !validPoint && <p className="status error" role="alert">El punto o elemento solicitado no está disponible.</p>}{unityUrl && (!punto || validPoint) ? <iframe title="Recorrido Unity" className="unity-frame" src={unityUrl} allowFullScreen /> : <div className="walkthrough-placeholder"><span aria-hidden="true">◎</span><h2>Recorrido WebGL en preparación</h2><p>El contrato está disponible. El build Unity se conectará aquí cuando se publique por separado.</p></div>}<div className="room-list">{data.salas.map((sala) => <article key={sala.id}><span className="section-num">Sala {sala.orden + 1}</span><h2>{sala.id}</h2><ul>{sala.puntos.map((item) => <li key={item.anclajeId}><span>{item.anclajeId}</span><span>{item.elementoIds.length} elementos disponibles</span></li>)}</ul></article>)}</div></>}</section>
}

function NotFound() {
  return <section className="page"><h1>Página no encontrada</h1><Link to="/">Volver al inicio</Link></section>
}

export default function App() {
  return <div className="site-shell"><header className="site-header"><Link className="brand" to="/" aria-label="Musiyo, ir al inicio"><span className="brand-mark">M</span><span>musiyo<span className="brand-sub"> Bëtsknaté</span></span></Link><nav aria-label="Navegación principal"><NavLink to="/" end>Inicio</NavLink><NavLink to="/catalogo">Catálogo</NavLink><NavLink to="/recorrido">Recorrido</NavLink></nav></header><main><Routes><Route path="/" element={<Home />} /><Route path="/catalogo" element={<Catalogo />} /><Route path="/elementos/:id" element={<Ficha />} /><Route path="/recorrido" element={<RecorridoPage />} /><Route path="*" element={<NotFound />} /></Routes></main><footer><span>Musiyo Bëtsknaté</span><span>Prototipo técnico · contenido sujeto a validación</span></footer></div>
}
