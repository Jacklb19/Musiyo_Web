import { Link } from 'react-router-dom'
import { api } from './api'
import type { Element } from './contracts'
import { subtitlesFor } from './detail-content'
import { RecordedAudio } from './RecordedAudio'
import { copy } from './interface-copy'

export function ResourceMedia({ element }: { element: Element }) {
  const resources = element.resources || []
  const firstNarration = resources.find(resource => resource.kind === 'narration')
  const images = resources.filter(resource => resource.kind === 'image')
  const recordings = resources.filter(resource => ['audio', 'narration', 'video'].includes(resource.kind) && resource.id !== firstNarration?.id)
  const restricted = element.restrictions?.some(item => item.kind === 'no_download') || false
  return <>
    {!!element.materials?.length && <p className="technique"><span>{copy.detail.materials}</span>{element.materials.join(', ')}</p>}
    {!!element.collections?.length && <nav className="record-collections" aria-label={copy.detail.collections}>{element.collections.map(item => <Link className="underlined" key={item.slug} to={'/catalogo?collection=' + encodeURIComponent(item.slug)}>{item.name}</Link>)}</nav>}
    {images.map(resource => <figure key={resource.id} className="record-image"><img src={api.resourceUrl(element.slug, resource.id)} alt={resource.alternative_text || copy.media.imageLabel(element.title)} loading="lazy"/><figcaption>{resource.credit}<details><summary>{copy.common.provenance}</summary><p>{resource.provenance}</p></details></figcaption></figure>)}
    {recordings.map(resource => {
      const subtitles = subtitlesFor(resource, resources)
      return <section key={resource.id} className="record-media">
        <h3>{resource.kind === 'video' ? copy.media.video : resource.kind === 'narration' ? copy.common.narration : copy.media.audio}</h3>
        {resource.kind === 'video' ? subtitles ? <video controls preload="none" aria-label={copy.media.videoLabel(element.title)} controlsList={restricted ? 'nodownload' : undefined}>
          <source src={api.resourceUrl(element.slug, resource.id)} type={resource.mime}/>
          <track kind="captions" src={api.resourceUrl(element.slug, subtitles.id)} srcLang="es" label={copy.media.spanish} default/>
        </video> : <p>{copy.media.noVideoCaptions}</p> : <RecordedAudio element={element.slug} title={element.title} resource={resource} subtitles={subtitles} downloadRestricted={restricted} appearance="exhibition"/>}
        {resource.kind === 'video' && resource.transcription && <details><summary>{copy.detail.transcription}</summary><p>{resource.transcription}</p></details>}
        <p className="media-credit">{resource.credit}</p><p className="media-credit">{resource.provenance}</p>
      </section>
    })}
    {element.last_modified && <p className="media-credit">{copy.media.lastCorrection}: <time dateTime={element.last_modified.date}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(new Date(element.last_modified.date))}</time>, {element.last_modified.author}.</p>}
  </>
}
