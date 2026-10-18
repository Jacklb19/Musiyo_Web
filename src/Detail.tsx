import { exhibitionCopy as ui } from './exhibition-copy'

import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { Element as MuseumElement } from './contracts'
import { useRecord, useTour } from './exhibition-data'
import { ModelStage } from './ModelStage'
import { ExhibitionAudio as AudioPlayer } from './ExhibitionAudio'
import { Guide as ContextGuide } from './Guide'
import { ResourceMedia } from './ResourceMedia'
import { presentation } from './presentation-config'
import { safeCatalogReturn } from './visit-navigation'
import { useValidatorSession } from './validator-session'
import { Arrow, Status } from './exhibition-ui'

const labels = { documented_fact: ui.documented, testimony: ui.testimony, interpretation: ui.interpretation }

export function Detail() {
  const { id: slug = '' } = useParams()
  const { session } = useValidatorSession()
  const record = useRecord(slug)
  const location = useLocation()
  const from = safeCatalogReturn(location.state?.from)
  const element = record.data
  useEffect(() => { if (element) document.title = `${element.title} · Musiyo Bëtsknaté` }, [element])
  const model = element?.resources?.find(resource => resource.kind === 'model_3d')
  const narration = element?.resources?.find(resource => resource.kind === 'narration')
  const tour = useTour()
  const room = tour.data?.rooms.find(room => room.points.some(point => point.elements.some(item => item.slug === slug)))
  const selectedPoint = room?.points.find(point => point.elements.some(item => item.slug === slug))
  const group = selectedPoint?.elements.filter(item => item.slug !== slug)
  const selection = new URLSearchParams({ tour: presentation.tourKey, point: selectedPoint?.key || '', element: slug })
  return <article className={`detail-page page-shell ${model ? 'detail-with-model' : 'detail-reading'}`} key={slug}>
    <div className="breadcrumb"><Link to={from} state={{ restoreCatalog: true }}>{ui.backBreadcrumb}</Link><span>/</span><span>{element?.category?.name || ui.pieceFallback}</span></div><Status {...record}/>
    {element && <><header className="detail-heading"><p className="eyebrow">{element.community?.name || ui.museumName}{room ? ` · ${room.name}` : ''}</p><h1>{element.title}</h1>{session?.authenticated && <Link className="underlined" to={`/validador/${encodeURIComponent(slug)}`}>{ui.correctRecord}</Link>}<nav aria-label={ui.recordContents}><a href="#reading" onClick={event => { event.preventDefault(); document.getElementById('reading')?.scrollIntoView() }}>{ui.readDetail}</a><a href="#sources" onClick={event => { event.preventDefault(); document.getElementById('sources')?.scrollIntoView() }}>{ui.sourcesJump}</a></nav></header>
    <div className="detail-layout">{model && <aside className="detail-media"><div className="media-frame"><span className="eyebrow">{ui.modelLabel}</span><ModelStage key={model.id} resource={model} title={element.title}/></div>{model.credit && <p className="media-credit">{model.credit}</p>}</aside>}
    <div className="detail-text" id="reading"><p className="detail-description">{element.description}</p>{element.technique && <p className="technique"><span>{ui.technique}</span>{element.technique}</p>}{narration && <AudioPlayer key={narration.id} slug={slug} resource={narration} resources={element.resources || []} title={element.title}/>}
    <div className="reading-blocks">{element.blocks?.map((block, index) => <section key={block.id} className={`reading-block block-${block.kind}`}><p className="eyebrow">{labels[block.kind]}</p>{block.kind === 'testimony' ? <blockquote>{block.text}</blockquote> : <p>{block.text}</p>}{block.attribution && <p className="block-attribution">{block.attribution}</p>}{block.context && <p className="small-copy">{block.context}</p>}{block.source_id && <a className="source-reference" href={`#source-${block.source_id}`} onClick={event => { event.preventDefault(); const details = document.getElementById('source-details') as HTMLDetailsElement | null; if (details) details.open = true; document.getElementById(`source-${block.source_id}`)?.scrollIntoView() }}>{ui.consultSource} <sup>{(element.sources?.findIndex(source => source.id === block.source_id) ?? -1) + 1 || index + 1}</sup> ↗</a>}</section>)}</div>
    {group && group.length > 0 && <section className="same-point"><p className="eyebrow">{ui.samePoint}</p>{group.map(item => <Link key={item.slug} to={`/elementos/${item.slug}`} state={{ from }}>{item.title} <Arrow/></Link>)}</section>}
    <ResourceMedia element={element}/><Sources element={element}/><ContextGuide key={slug} elementSlug={slug} embedded/></div></div>
    <section className="detail-continuation"><div><p className="eyebrow">{ui.continueVisit}</p><h2>{ui.alwaysAnother}<br/><em>{ui.anotherView}</em></h2></div><div className="continuation-actions">{selectedPoint && <Link className="pill primary visit-3d-link" to={'/recorrido?' + selection.toString()}>{ui.enterTour} <Arrow/></Link>}<Link className="pill dark" to={from} state={{ restoreCatalog: true }}>{ui.backCollection} <Arrow/></Link>{room && <Link className="underlined" to={`/recorrido/texto?room=${encodeURIComponent(room.key)}`}>Encontrar en {room.name} <Arrow/></Link>}</div></section></>}
  </article>
}

function Sources({ element }: { element: MuseumElement }) {
  return <section id="sources" className="sources"><details id="source-details"><summary>{ui.sources} <span>{element.sources?.length || 0} +</span></summary><ol>{element.sources?.map(source => <li id={`source-${source.id}`} key={source.id}><p>{source.reference}</p>{source.url && /^https?:\/\//.test(source.url) && <a className="underlined" href={source.url} target="_blank" rel="noreferrer">{ui.consultPublication} <Arrow/></a>}</li>)}</ol></details><details><summary>{ui.creditsProvenance} <span>+</span></summary>{element.credits?.map((credit, index) => <p key={index}>{credit.role}: {credit.name}</p>)}{element.resources?.map(resource => <div key={resource.id}><p>{resource.credit}</p><p className="small-copy">{resource.provenance}</p></div>)}{!element.credits?.length && !element.resources?.length && <p>{ui.noExtraCredits}</p>}</details><details><summary>{ui.usageConditions} <span>+</span></summary>{element.restrictions?.length ? element.restrictions.map((restriction, index) => <p key={index}>{restriction.description}</p>) : <p>{ui.checkSources}</p>}</details></section>
}
