import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import { useApi } from './use-api'
import { ElementCard } from './ElementCard'
import { copy } from './interface-copy'
import { presentation } from './presentation-config'
import { ModelViewer } from './ModelViewer'
import { webModelResourceId } from './model-controls'

function ExhibitionModel({ slug, title }: { slug: string; title: string }) {
  const [attempt, setAttempt] = useState(0)
  const load = useCallback((signal: AbortSignal) => { void attempt; return api.element(slug, signal) }, [slug, attempt])
  const { data, loading, error } = useApi(load)
  const model = data?.resources?.find(resource => webModelResourceId(resource))
  if (loading) return <output className="status">{copy.detail.loading}</output>
  if (error) return <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>{copy.common.retry}</button></p>
  return model ? <ModelViewer resource={model} title={title} /> : <p>{copy.common.noWebModel}</p>
}

export function Home() {
  const [attempt, setAttempt] = useState(0)
  const [modelOpen, setModelOpen] = useState(false)
  const load = useCallback((signal: AbortSignal) => {
    void attempt
    return api.catalog(new URLSearchParams({ schema_version: '1', category: presentation.exhibitionCategory, limit: String(presentation.featuredLimit), offset: '0' }), signal)
  }, [attempt])
  const { data, loading, error } = useApi(load)
  const featured = data?.items[0]
  const exhibitionUrl = '/catalogo?category=' + encodeURIComponent(presentation.exhibitionCategory)
  return <>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow hero-chip">{copy.home.eyebrow}</p>
        <h1>{copy.home.title}<em>{copy.home.titleAccent}</em></h1><p className="lead">{copy.home.intro}</p>
        <div className="actions"><Link className="button primary" to="/recorrido">{copy.home.enter} <span aria-hidden="true">→</span></Link><Link className="button secondary" to="/catalogo">{copy.home.catalog}</Link></div>
        <p className="hero-note">{copy.home.note}</p>
      </div>
      <div className="hero-exhibition">
        <p className="section-num">{copy.home.featured}</p>
        {featured && modelOpen ? <ExhibitionModel key={featured.slug} slug={featured.slug} title={featured.title} /> : <div className="exhibition-stage"><span aria-hidden="true">{featured?.has_3d_model ? '3D' : 'Aa'}</span><p>{featured?.has_3d_model ? copy.common.noPhoto : copy.common.textRecord}</p></div>}
        {featured ? <><h2>{featured.title}</h2><Link className="exhibition-link" to={'/elementos/' + encodeURIComponent(featured.slug)}>{copy.common.openDetail} <span aria-hidden="true">↗</span></Link><p className="showcase-note">{copy.home.showcaseNote}</p></> : <p className="showcase-note">{loading ? copy.common.loading : error || copy.home.unavailable}</p>}
        {featured?.has_3d_model && <button className="button primary showcase-model-toggle" type="button" aria-expanded={modelOpen} onClick={() => setModelOpen(value => !value)}>{modelOpen ? copy.common.closeModel : copy.common.inspect}</button>}
      </div>
    </section>
    <section className="home-section" aria-labelledby="ways-title"><p className="eyebrow">{copy.home.ways}</p><h2 id="ways-title">{copy.home.waysTitle}</h2>
      <div className="intro-grid"><article><span className="section-num">01 / {copy.site.catalog}</span><h3>{copy.home.reading}</h3><p>{copy.home.readingIntro}</p><Link to="/catalogo">{copy.home.catalog} <span aria-hidden="true">→</span></Link></article>
        <article><span className="section-num">02 / {copy.site.tour}</span><h3>{copy.home.visitTitle}</h3><p>{copy.home.visitIntro}</p><Link to="/recorrido/texto">{copy.home.textTour} <span aria-hidden="true">→</span></Link></article></div>
    </section>
    <section className="home-section exhibition-section" aria-labelledby="exhibition-title"><div className="section-heading"><div><p className="eyebrow">{copy.home.exhibition}</p><h2 id="exhibition-title">{copy.home.exhibitionTitle}</h2><p>{copy.home.exhibitionIntro}</p></div><Link className="button secondary" to={exhibitionUrl}>{copy.home.allMasks} <span aria-hidden="true">→</span></Link></div>
      {loading && <output className="status">{copy.common.loading}</output>}
      {error && <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>{copy.common.retry}</button></p>}
      {data && (data.items.length ? <div className="cards">{data.items.map(item => <ElementCard key={item.slug} item={item} />)}</div> : <p className="status">{copy.home.unavailable}</p>)}
    </section>
    <section className="visit-banner"><div><p className="eyebrow">{copy.site.tour}</p><h2>{copy.home.visitTitle}</h2><p>{copy.home.visitNote}</p></div><div className="actions"><Link className="button primary" to="/recorrido">{copy.home.enter} <span aria-hidden="true">→</span></Link><Link className="button secondary" to="/acerca">{copy.home.about}</Link></div></section>
  </>
}
