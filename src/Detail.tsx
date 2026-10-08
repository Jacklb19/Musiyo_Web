import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from './api'
import { useValidatorSession } from './validator-session'
import { groupedBlocks, safeSourceUrl, subtitlesFor } from './detail-content'
import { useApi } from './use-api'
import type { Resource } from './contracts'
import { ModelSection } from './ModelSection'
import { copy } from './interface-copy'
import { presentation } from './presentation-config'

function RecordedAudio({ element, title, resource, downloadRestricted }: { element: string; title: string; resource: Resource; downloadRestricted: boolean }) {
  if (!resource.transcription) return <p>{copy.media.noAudioTranscript}</p>
  // HTML audio has a paired visible transcription below instead of a video caption track.
  // oxlint-disable-next-line jsx-a11y/media-has-caption
  return <audio controls preload="none" aria-label={copy.media.audioLabel(title, resource.kind === 'narration')} controlsList={downloadRestricted ? 'nodownload' : undefined}>
    <source src={api.resourceUrl(element, resource.id)} type={resource.mime} />{copy.media.audioUnsupported}
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
  const tourKey = presentation.tourKey
  const loadTour = useCallback((signal: AbortSignal) => api.tour(tourKey, signal), [tourKey])
  const tour = useApi(loadTour)
  const point = tour.data?.rooms.flatMap((room) => room.points).find((candidate) => candidate.elements.some((item) => item.slug === id))
  const tourQuery = new URLSearchParams({ tour: tourKey, point: point?.key || '', element: id })
  const resources = data?.resources || []
  const models = resources.filter((resource) => resource.kind === 'model_3d')
  const images = resources.filter((resource) => resource.kind === 'image')
  const recordings = resources.filter((resource) => ['audio', 'narration', 'video'].includes(resource.kind))
  const downloadRestricted = data?.restrictions?.some((restriction) => restriction.kind === 'no_download') || false
  const Title = elementId ? 'h2' : 'h1'
  const Heading = elementId ? 'h3' : 'h2'

  return <section className="page detail-page">
    <Link className="back" to="/catalogo">{copy.common.backCatalog}</Link>
    {loading && <output className="status">{copy.detail.loading}</output>}
    {error && <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>{copy.common.retry}</button></p>}
    {data && <article className="ficha detail-layout">
      <header className="detail-heading">
      {session?.authenticated && <Link className="button secondary" to={'/validador/' + encodeURIComponent(data.slug)}>{copy.detail.correct}</Link>}
      <p className="eyebrow">{copy.detail.eyebrow}</p><Title>{data.title}</Title>
      <dl className="detail-metadata">
        {data.community && <><dt>{copy.detail.community}</dt><dd>{data.community.name} · {copy.media.people[data.community.people] || data.community.people}</dd></>}
        {data.category && <><dt>{copy.detail.category}</dt><dd><Link to={'/catalogo?category=' + encodeURIComponent(data.category.slug)}>{data.category.name}</Link></dd></>}
        {!!data.collections?.length && <><dt>{copy.detail.collections}</dt><dd>{data.collections.map((collection) => <Link key={collection.slug} to={'/catalogo?collection=' + encodeURIComponent(collection.slug)}>{collection.name}</Link>)}</dd></>}
        {data.technique && <><dt>{copy.detail.technique}</dt><dd>{data.technique}</dd></>}
        {!!data.materials?.length && <><dt>{copy.detail.materials}</dt><dd>{data.materials.join(', ')}</dd></>}
      </dl>
      <p className="lead detail-description">{data.description}</p>
      {point && <div className="detail-actions"><Link className="button primary detail-tour-link" to={'/recorrido?' + tourQuery.toString()}>{copy.detail.openTour} <span aria-hidden="true">→</span></Link><Link className="text-tour-link" to="/recorrido/texto">{copy.detail.openTextTour}</Link></div>}
      </header>
      <div className="detail-body">
      {groupedBlocks(data).map((group) => <section key={group.kind}><Heading>{group.title}</Heading>{group.blocks.map((block) => {
        const source = data.sources?.find((item) => item.id === block.source_id)
        return <div className="detail-block" key={block.id}>
          {block.attribution && <p className="block-attribution">{group.kind === 'interpretation' ? copy.detail.accordingTo : ''}{block.attribution}</p>}
          <p>{block.text}</p>{block.context && <p className="block-context">{copy.detail.context}: {block.context}</p>}
          {source && <p className="block-source">{copy.detail.source}: {source.reference}</p>}
        </div>
      })}</section>)}
      </div>
      <div className="detail-media">
      {models.map((resource, index) => <ModelSection key={id + resource.id} resource={resource} title={data.title} index={index} embedded={!!elementId} />)}
      {!models.length && !images.length && <div className="reading-preview"><span aria-hidden="true">Aa</span><p>{copy.detail.noResources}</p></div>}
      {!!images.length && <section><Heading>{copy.detail.images}</Heading>{images.map((resource) => <figure key={resource.id}>
        <img className="detail-image" src={api.resourceUrl(id, resource.id)} alt={resource.alternative_text || copy.media.imageLabel(data.title)} loading="lazy" />
        <figcaption>{resource.credit && <span>{copy.common.credit}: {resource.credit}</span>}{resource.provenance && <span>{copy.common.provenance}: {resource.provenance}</span>}</figcaption>
      </figure>)}</section>}
      {!!recordings.length && <section id="narrations"><Heading>{copy.detail.multimedia}</Heading>{recordings.map((resource, index) => {
        const subtitles = subtitlesFor(resource, resources)
        return <div className="media-item" key={resource.id}>
          <h3>{resource.kind === 'narration' ? copy.common.narration : resource.kind === 'video' ? copy.media.video : copy.media.audio} {index + 1}</h3>
          {resource.duration_seconds != null && <p>{copy.media.duration}: {copy.media.seconds(Math.round(resource.duration_seconds))}</p>}
          {resource.kind === 'video' ? subtitles ? <video controls preload="none" aria-label={copy.media.videoLabel(data.title)} controlsList={downloadRestricted ? 'nodownload' : undefined}>
            <source src={api.resourceUrl(id, resource.id)} type={resource.mime} />
            <track kind="captions" src={api.resourceUrl(id, subtitles.id)} srcLang="es" label={copy.media.spanish} default />
            {copy.media.videoUnsupported}
          </video> : <p>{copy.media.noVideoCaptions}</p> : <RecordedAudio element={id} title={data.title} resource={resource} downloadRestricted={downloadRestricted} />}
          {resource.transcription && <details><summary>{copy.detail.transcription}</summary><p>{resource.transcription}</p></details>}
          {resource.credit && <p>{copy.common.credit}: {resource.credit}</p>}{resource.provenance && <p>{copy.common.provenance}: {resource.provenance}</p>}
        </div>
      })}</section>}
      </div>
      <div className="detail-support">
      {!!data.sources?.length && <section><Heading>{copy.detail.sources}</Heading>{data.sources.map((source) => {
        const url = safeSourceUrl(source.url)
        return <p key={source.id}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{source.reference} <span className="visually-hidden">{copy.media.externalTab}</span></a> : source.reference}</p>
      })}</section>}
      {!!data.credits?.length && <section><Heading>{copy.detail.credits}</Heading>{data.credits.map((credit, index) => <p key={index}>{credit.role ? credit.role + ': ' : ''}{credit.name}</p>)}</section>}
      {!!data.restrictions?.length && <section><Heading>{copy.detail.restrictions}</Heading>{data.restrictions.map((restriction, index) => <p key={index}>{restriction.description}</p>)}</section>}
      {data.last_modified && <p className="last-modified">{copy.media.lastCorrection}: <time dateTime={data.last_modified.date}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(new Date(data.last_modified.date))}</time>, {copy.media.author} {data.last_modified.author}.</p>}
      </div>
    </article>}
  </section>
}
