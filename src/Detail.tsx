import { exhibitionCopy as ui } from './exhibition-copy'

import { useCallback, useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from './api'
import type { ElementSummary, Element as MuseumElement } from './contracts'
import { useData, useRecord, useTour } from './exhibition-data'
import { ModelStage } from './ModelStage'
import { ExhibitionAudio as AudioPlayer } from './ExhibitionAudio'
import { Guide as ContextGuide } from './Guide'
import { ResourceMedia } from './ResourceMedia'
import { presentation } from './presentation-config'
import { safeCatalogReturn } from './visit-navigation'
import { useValidatorSession } from './validator-session'
import { Arrow, ExternalArrow, Status } from './exhibition-ui'
import { blockNotes, creditLine, publicCredits } from './detail-content'

const labels = { documented_fact: ui.documented, testimony: ui.testimony, interpretation: ui.interpretation }

export function Detail() {
  const { id: slug = '' } = useParams()
  const { session } = useValidatorSession()
  const record = useRecord(slug)
  const location = useLocation()
  const from = safeCatalogReturn(location.state?.from)
  const element = record.data
  const missing = record.error && record.notFound
  useEffect(() => { if (element) document.title = `${element.title} · Musiyo Bëtsknaté`; else if (missing) document.title = 'Pieza no encontrada · Musiyo Bëtsknaté' }, [element, missing])
  const model = element?.resources?.find(resource => resource.kind === 'model_3d')
  const narration = element?.resources?.find(resource => resource.kind === 'narration')
  const image = element?.resources?.find(resource => resource.kind === 'image')
  const notes = element ? blockNotes(element) : []
  const credits = element ? creditLine(element) : ''
  const tour = useTour()
  const room = tour.data?.rooms.find(room => room.points.some(point => point.elements.some(item => item.slug === slug)))
  const selectedPoint = room?.points.find(point => point.elements.some(item => item.slug === slug))
  const group = selectedPoint?.elements.filter(item => item.slug !== slug)
  const selection = new URLSearchParams({ tour: presentation.tourKey, point: selectedPoint?.key || '', element: slug })
  return <article className={`detail-page page-shell ${model ? 'detail-with-model' : 'detail-reading'}`} key={slug}>
    <div className="breadcrumb"><Link to={from} state={{ restoreCatalog: true }}>{ui.backBreadcrumb}</Link><span>/</span><span>{element?.category?.name || ui.pieceFallback}</span></div>{missing ? <div className="status not-found" role="alert"><h1>{ui.pieceNotFound}</h1><p>{ui.pieceNotFoundHint}</p><Link className="pill dark" to="/catalogo">{ui.viewCollection} <Arrow/></Link></div> : <Status {...record}/>}
    {element && <><header className="detail-heading"><p className="eyebrow">{element.community?.name || ui.museumName}{room ? ` · ${room.name}` : ''}</p><h1>{element.title}</h1>{session?.authenticated && <Link className="underlined" to={`/validador/${encodeURIComponent(slug)}`}>{ui.correctRecord}</Link>}<nav aria-label={ui.recordContents}><a href="#reading" onClick={event => { event.preventDefault(); document.getElementById('reading')?.scrollIntoView() }}>{ui.readDetail}</a><a href="#sources" onClick={event => { event.preventDefault(); document.getElementById('sources')?.scrollIntoView() }}>{ui.sourcesJump}</a></nav></header>
    <div className="detail-layout">{!model && <DetailPlate element={element} image={image ? api.resourceUrl(slug, image.id) : null} room={room?.name} related={group || []} from={from}/>}{model && <aside className="detail-media"><div className="media-frame"><span className="eyebrow">{ui.modelLabel}</span><ModelStage key={model.id} resource={model} title={element.title} poster={image ? api.resourceUrl(slug, image.id) : undefined}/></div>{model.credit && <p className="media-credit">{model.credit}</p>}</aside>}
    <div className="detail-text" id="reading"><p className="detail-description">{element.description}</p>{element.technique && <p className="technique"><span>{ui.technique}</span>{element.technique}</p>}{narration && <AudioPlayer key={narration.id} slug={slug} resource={narration} resources={element.resources || []} title={element.title}/>}
    <div className="reading-blocks">{element.blocks?.map(block => { const note = notes.find(item => item.blockId === block.id); const marker = note && <sup className="note-marker"><a href={`#note-${note.number}`} aria-label={`${ui.reference} ${note.number}`} onClick={event => { event.preventDefault(); document.getElementById(`note-${note.number}`)?.scrollIntoView() }}>{note.number}</a></sup>; return <section key={block.id} className={`reading-block block-${block.kind}`}><p className="eyebrow">{labels[block.kind]}</p>{block.kind === 'testimony' ? <blockquote>{block.text}{marker}</blockquote> : <p>{block.text}{marker}</p>}</section> })}</div>
    {(notes.length > 0 || credits) && <section className="record-references" aria-label={ui.references}><p className="eyebrow">{ui.references}</p>{notes.length > 0 && <ol>{notes.filter((note, index) => notes.findIndex(item => item.number === note.number) === index).map(note => <li key={note.number} id={`note-${note.number}`} value={note.number}>{note.text}</li>)}</ol>}{credits && <p className="record-credits">{credits}</p>}</section>}
    {model && group && group.length > 0 && <section className="same-point"><p className="eyebrow">{ui.samePoint}</p>{group.map(item => <Link key={item.slug} to={`/elementos/${item.slug}`} state={{ from }}>{item.title} <Arrow/></Link>)}</section>}
    <ResourceMedia element={element}/><Sources element={element}/><ContextGuide key={slug} elementSlug={slug} embedded/></div></div>
    <section className="detail-continuation"><div><p className="eyebrow">{ui.continueVisit}</p><h2>{ui.alwaysAnother}<br/><em>{ui.anotherView}</em></h2></div><div className="continuation-actions">{selectedPoint && <Link className="pill primary visit-3d-link" to={'/recorrido?' + selection.toString()}>{ui.seeInMuseum} <Arrow/></Link>}<Link className="pill dark" to={from} state={{ restoreCatalog: true }}>{ui.backCollection} <Arrow/></Link>{room && <Link className="underlined" to={`/recorrido/texto?room=${encodeURIComponent(room.key)}`}>Encontrar en {room.name} <Arrow/></Link>}</div></section></>}
  </article>
}

function Sources({ element }: { element: MuseumElement }) {
  return <section id="sources" className="sources"><details id="source-details"><summary>{ui.sources} <span>{element.sources?.length || 0} +</span></summary><ol>{element.sources?.map(source => <li id={`source-${source.id}`} key={source.id}><p>{source.reference}</p>{source.url && /^https?:\/\//.test(source.url) && <a className="underlined" href={source.url} target="_blank" rel="noreferrer">{ui.consultPublication} <ExternalArrow/></a>}</li>)}</ol></details><details><summary>{ui.creditsProvenance} <span>+</span></summary>{element.credits?.map((credit, index) => <p key={index}>{credit.role ? `${credit.role}: ${credit.name}` : credit.name}</p>)}{publicCredits(element.resources || []).map(credit => <p key={credit}>{credit}</p>)}{!element.credits?.length && !element.resources?.length && <p>{ui.noExtraCredits}</p>}</details><details><summary>{ui.usageConditions} <span>+</span></summary>{element.restrictions?.length ? element.restrictions.map((restriction, index) => <p key={index}>{restriction.description}</p>) : <p>{ui.checkSources}</p>}</details></section>
}

// A record without its own image or model still gets a museum label: where it is shown and the
// pieces published at the same point, with their own approved thumbnails.
function DetailPlate({ element, image, room, related, from }: { element: MuseumElement; image: string | null; room?: string; related: ElementSummary[]; from: string }) {
  const catalog = useData(useCallback((signal: AbortSignal) => api.catalog(new URLSearchParams('schema_version=1&limit=48&offset=0'), signal), []))
  const thumbnails = new Map(catalog.data?.items.map(item => [item.slug, item.thumbnail_resource_id]) || [])
  return <aside className="detail-plate" aria-label={ui.plateLabel}>
    {image && <img className="plate-image" src={image} alt={element.resources?.find(resource => resource.kind === 'image')?.alternative_text || ''}/>}
    <p className="eyebrow">{ui.plateLabel}</p>
    <dl>
      {element.category?.name && <><dt>{ui.plateTopic}</dt><dd>{element.category.name}</dd></>}
      {element.community?.name && <><dt>{ui.plateCommunity}</dt><dd>{element.community.name}</dd></>}
      {room && <><dt>{ui.plateRoom}</dt><dd>{room}</dd></>}
    </dl>
    {related.length > 0 && <section className="plate-related"><p className="eyebrow">{ui.samePoint}</p>{related.map(item => {
      const thumbnail = thumbnails.get(item.slug)
      return <Link key={item.slug} to={`/elementos/${item.slug}`} state={{ from }}>{thumbnail && <img src={api.resourceUrl(item.slug, thumbnail)} alt="" width="96" height="72" loading="lazy" decoding="async"/>}<span>{item.title}</span><Arrow/></Link>
    })}</section>}
  </aside>
}
