import { exhibitionCopy as ui } from './exhibition-copy'

import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import { useData, useRecord, useTour } from './exhibition-data'
import { ModelStage } from './ModelStage'
import { ExhibitionAudio as AudioPlayer } from './ExhibitionAudio'
import { presentation } from './presentation-config'
import { Arrow, Status } from './exhibition-ui'

export function Home() {
  const context = useRecord(presentation.introductionSlug)
  const mask = useRecord(presentation.featuredElementSlug)
  const characters = useData(useCallback((signal: AbortSignal) => api.catalog(new URLSearchParams('schema_version=1&limit=24&offset=0&category=personajes'), signal), []))
  const tour = useTour()
  const model = mask.data?.resources?.find(resource => resource.kind === 'model_3d')
  const narration = context.data?.resources?.find(resource => resource.kind === 'narration')
  function discover() { document.getElementById('the-beginning')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); document.getElementById('the-beginning')?.focus({ preventScroll: true }) }
  return <>
    <section className="opening" aria-labelledby="home-title">
      <p className="opening-kicker eyebrow">{ui.museumPurpose}</p>
      <h1 id="home-title">{ui.celebrationName}</h1>
      <div className="stage-lines" aria-hidden="true"><i/><i/><i/></div>
      <div className="opening-model">{model ? <ModelStage resource={model} title={mask.data!.title} large/> : <Status {...mask}/>}</div>
      <div className="opening-intro"><p>{ui.visitOpening}<br/>{ui.listenUnderstand}</p><button className="pill primary" onClick={discover}>{ui.discoverCarnival} <span aria-hidden="true">↓</span></button></div>
      {mask.data && <Link className="opening-caption" to={`/elementos/${presentation.featuredElementSlug}`}><span className="eyebrow">En exposición · {mask.data.community?.name}</span><strong>{mask.data.title}</strong><span className="caption-bottom">{ui.explorePiece} <Arrow/></span></Link>}
      <div className="opening-side-note" aria-hidden="true">{ui.lookCloserVertical}</div>
    </section>
    <div className="chapter-bridge"><span className="chapter-no">01</span><span>{ui.namesFirst}<small>{ui.visitStart}</small></span><button className="circle" onClick={discover} aria-label={ui.goBeginning}>↓</button></div>
    <section className="beginning section-shell" id="the-beginning" tabIndex={-1} aria-labelledby="beginning-title">
      <div className="section-marker"><span className="eyebrow">{ui.beginning}</span><span className="fine-line"/></div>
      <div className="beginning-content"><h2 id="beginning-title">{ui.bigDay}<br/><em>{ui.severalNames}</em></h2><Status {...context}/>{context.data && <><p className="lead-copy">{context.data.description}</p><Link className="underlined" to={`/elementos/${presentation.introductionSlug}`}>{ui.readStory} <Arrow/></Link>{narration && <AudioPlayer slug={context.data.slug} resource={narration} resources={context.data.resources || []} title={context.data.title}/>}</>}</div>
    </section>
    <section className="character-chapter section-shell" aria-labelledby="characters-title"><div className="section-marker"><span className="eyebrow">{ui.charactersChapter}</span><span className="fine-line"/></div><div className="character-content"><div className="chapter-heading"><h2 id="characters-title">{ui.eachName}<br/><em>{ui.oneStory}</em></h2><Link className="pill secondary" to="/catalogo?category=personajes">{ui.exploreCharacters} <Arrow/></Link></div><Status {...characters}/><div className="character-index">{characters.data?.items.map((item, index) => <Link to={`/elementos/${item.slug}`} key={item.slug}><span className="index-number">{String(index + 1).padStart(2, '0')}</span><span className="index-title">{item.title}</span><span className="index-kind">{item.has_narration ? ui.readListen : item.has_3d_model ? ui.readLook : ui.readStoryShort}</span><span className="index-arrow"><Arrow/></span></Link>)}</div></div></section>
    <section className="collection-invitation section-shell"><div className="section-marker"><span className="eyebrow">{ui.collectionHeading}</span><span className="fine-line"/></div><div className="collection-invitation-content"><span className="oversized-word" aria-hidden="true">{ui.closeView}</span><div><h2>{ui.pauseAt}<br/>{ui.curiousAbout}</h2><p>{ui.collectionInvitation}</p><Link className="pill primary" to="/catalogo">{ui.openCollection} <Arrow/></Link></div><nav className="topic-links" aria-label={ui.exploreTopics}><Link to="/catalogo?category=mascaras">{ui.masks} <Arrow/></Link><Link to="/catalogo?category=instrumentos">{ui.instruments} <Arrow/></Link><Link to="/catalogo?category=relatos">{ui.stories} <Arrow/></Link></nav></div></section>
    <section className="visit-invitation section-shell"><div className="section-marker"><span className="eyebrow">{ui.anotherVisit}</span><span className="fine-line"/></div><div className="visit-invitation-content"><h2>{ui.museumTitle}<br/><em>{ui.ownPace}</em></h2><div><p>{ui.freeVisit}</p><Link className="pill dark" to="/recorrido/texto">{ui.prepareVisit} <Arrow/></Link><p className="small-copy">{ui.durationHint}</p></div></div>{tour.data && <div className="room-ribbon" aria-label={ui.museumRooms}>{tour.data.rooms.map((room, index) => <span key={room.key}><b>{String(index + 1).padStart(2, '0')}</b>{room.name}</span>)}</div>}</section>
  </>
}
