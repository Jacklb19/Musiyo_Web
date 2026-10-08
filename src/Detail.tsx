import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from './api'
import { useValidatorSession } from './validator-session'
import { groupedBlocks, safeSourceUrl, subtitlesFor } from './detail-content'
import { useApi } from './use-api'
import type { Resource } from './contracts'
import { ModelSection } from './ModelSection'

function RecordedAudio({ element, title, resource, downloadRestricted }: { element: string; title: string; resource: Resource; downloadRestricted: boolean }) {
  if (!resource.transcription) return <p>La transcripción de este audio no está disponible.</p>
  // HTML audio has a paired visible transcription below instead of a video caption track.
  // oxlint-disable-next-line jsx-a11y/media-has-caption
  return <audio controls preload="none" aria-label={(resource.kind === 'narration' ? 'Narración de ' : 'Audio de ') + title} controlsList={downloadRestricted ? 'nodownload' : undefined}>
    <source src={api.resourceUrl(element, resource.id)} type={resource.mime} />Tu navegador no puede reproducir este audio.
  </audio>
}

export function Detail({ elementId }: { elementId?: string } = {}) {
  const { session } = useValidatorSession()
  const { id: routeId = '' } = useParams()
  const id = elementId || routeId
  const [attempt, setAttempt] = useState(0)
  const load = useCallback((signal: AbortSignal) => {
    void attempt
    return api.element(id, signal)
  }, [id, attempt])
  const { data, error, loading } = useApi(load)
  const tourKey = import.meta.env.VITE_TOUR_KEY || 'museum-main'
  const loadTour = useCallback((signal: AbortSignal) => api.tour(tourKey, signal), [tourKey])
  const tour = useApi(loadTour)
  const point = tour.data?.rooms.flatMap((room) => room.points).find((candidate) => candidate.elements.some((item) => item.slug === id))
  const tourQuery = new URLSearchParams({ tour: tourKey, point: point?.key || '', element: id })
  const resources = data?.resources || []
  const models = resources.filter((resource) => resource.kind === 'model_3d')
  const images = resources.filter((resource) => resource.kind === 'image')
  const recordings = resources.filter((resource) => ['audio', 'narration', 'video'].includes(resource.kind))
  const downloadRestricted = data?.restrictions?.some((restriction) => restriction.kind === 'no_download') || false

  return <section className="page">
    <Link className="back" to="/catalogo">← Volver al catálogo</Link>
    {loading && <output className="status">Cargando ficha…</output>}
    {error && <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></p>}
    {data && <article className="ficha">
      {session?.authenticated && <Link className="button secondary" to={'/validador/' + encodeURIComponent(data.slug)}>Corregir ficha</Link>}
      <p className="eyebrow">Archivo / ficha</p><h1>{data.title}</h1>
      <dl className="detail-metadata">
        {data.community && <><dt>Comunidad</dt><dd>{data.community.name} · {({ kamentsa: 'Pueblo Kamëntsá', inga: 'Pueblo Inga', shared: 'Participación compartida' } as Record<string, string>)[data.community.people] || data.community.people}</dd></>}
        {data.category && <><dt>Categoría</dt><dd><Link to={'/catalogo?category=' + encodeURIComponent(data.category.slug)}>{data.category.name}</Link></dd></>}
        {!!data.collections?.length && <><dt>Colecciones</dt><dd>{data.collections.map((collection) => <Link key={collection.slug} to={'/catalogo?collection=' + encodeURIComponent(collection.slug)}>{collection.name}</Link>)}</dd></>}
        {data.technique && <><dt>Técnica</dt><dd>{data.technique}</dd></>}
        {!!data.materials?.length && <><dt>Materiales</dt><dd>{data.materials.join(', ')}</dd></>}
      </dl>
      <p className="lead detail-description">{data.description}</p>
      {groupedBlocks(data).map((group) => <section key={group.kind}><h2>{group.title}</h2>{group.blocks.map((block) => {
        const source = data.sources?.find((item) => item.id === block.source_id)
        return <div className="detail-block" key={block.id}>
          {block.attribution && <p className="block-attribution">{group.kind === 'interpretation' ? 'Según ' : ''}{block.attribution}</p>}
          <p>{block.text}</p>{block.context && <p className="block-context">Contexto: {block.context}</p>}
          {source && <p className="block-source">Fuente: {source.reference}</p>}
        </div>
      })}</section>)}
      {models.map((resource, index) => <ModelSection key={id + resource.id} resource={resource} title={data.title} index={index} />)}
      {!!images.length && <section><h2>Imágenes</h2>{images.map((resource) => <figure key={resource.id}>
        <img className="detail-image" src={api.resourceUrl(id, resource.id)} alt={resource.alternative_text || 'Imagen de ' + data.title} loading="lazy" />
        <figcaption>{resource.credit && <span>Crédito: {resource.credit}</span>}{resource.provenance && <span>Procedencia: {resource.provenance}</span>}</figcaption>
      </figure>)}</section>}
      {!!recordings.length && <section id="narrations"><h2>Narraciones y multimedia</h2>{recordings.map((resource, index) => {
        const subtitles = subtitlesFor(resource, resources)
        return <div className="media-item" key={resource.id}>
          <h3>{resource.kind === 'narration' ? 'Narración' : resource.kind === 'video' ? 'Video' : 'Audio'} {index + 1}</h3>
          {resource.duration_seconds != null && <p>Duración: {Math.round(resource.duration_seconds)} {Math.round(resource.duration_seconds) === 1 ? 'segundo' : 'segundos'}</p>}
          {resource.kind === 'video' ? subtitles ? <video controls preload="none" aria-label={'Video de ' + data.title} controlsList={downloadRestricted ? 'nodownload' : undefined}>
            <source src={api.resourceUrl(id, resource.id)} type={resource.mime} />
            <track kind="captions" src={api.resourceUrl(id, subtitles.id)} srcLang="es" label="Español" default />
            Tu navegador no puede reproducir este video.
          </video> : <p>Este video no tiene subtítulos disponibles.</p> : <RecordedAudio element={id} title={data.title} resource={resource} downloadRestricted={downloadRestricted} />}
          {resource.transcription && <details><summary>Leer transcripción</summary><p>{resource.transcription}</p></details>}
          {resource.credit && <p>Crédito: {resource.credit}</p>}{resource.provenance && <p>Procedencia: {resource.provenance}</p>}
        </div>
      })}</section>}
      {!!data.sources?.length && <section><h2>Fuentes</h2>{data.sources.map((source) => {
        const url = safeSourceUrl(source.url)
        return <p key={source.id}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{source.reference} <span className="visually-hidden">(se abre en otra pestaña)</span></a> : source.reference}</p>
      })}</section>}
      {!!data.credits?.length && <section><h2>Créditos</h2>{data.credits.map((credit, index) => <p key={index}>{credit.role ? credit.role + ': ' : ''}{credit.name}</p>)}</section>}
      {!!data.restrictions?.length && <section><h2>Restricciones de uso</h2>{data.restrictions.map((restriction, index) => <p key={index}>{restriction.description}</p>)}</section>}
      {data.last_modified && <p className="last-modified">Última corrección: <time dateTime={data.last_modified.date}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(new Date(data.last_modified.date))}</time>, por {data.last_modified.author}.</p>}
      {point && <Link className="button primary detail-tour-link" to={'/recorrido?' + tourQuery.toString()}>Ver en el recorrido 3D</Link>}
    </article>}
  </section>
}
