import { VisitQuiz } from './VisitQuiz'
import { exhibitionCopy as ui } from './exhibition-copy'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api } from './api'
import type { CatalogItem } from './contracts'
import { catalogRequest, changeCatalogFilter, catalogPageSize } from './catalog-params'
import { useData, useRecord } from './exhibition-data'
import { ModelStage } from './ModelStage'
import { presentation } from './presentation-config'
import { Arrow, SearchIcon, Status } from './exhibition-ui'

export function Catalog() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const request = catalogRequest(params).toString()
  const results = useData(useCallback((signal: AbortSignal) => api.catalog(new URLSearchParams(request), signal), [request]))
  const facets = useData(useCallback((signal: AbortSignal) => api.categories(signal), []))
  const collections = useData(useCallback((signal: AbortSignal) => api.collections(signal), []))
  const collection = params.get('collection') || ''
  // Topics are the one filter on screen; a collection arrives only from a record's link and can be removed.
  const collectionName = collections.data?.find(item => item.slug === collection)?.name || ui.selectedCollection
  const search = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const filterButton = useRef<HTMLButtonElement>(null)
  const [draftCategory, setDraftCategory] = useState(params.get('category') || '')
  const category = new URLSearchParams(request).get('category') || ''
  const query = new URLSearchParams(request).get('query') || ''
  const page = Number(new URLSearchParams(request).get('offset')) / catalogPageSize + 1
  // Keep what the visitor is typing (a trailing space, say) while the address follows it.
  useEffect(() => { if (search.current && search.current.value.trim() !== query) search.current.value = query }, [query])
  const typing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reveal = useRef(false)
  useEffect(() => () => clearTimeout(typing.current), [])
  // After Enter the results start below the fold; bring them up without taking focus from the field.
  const revealResults = useCallback(() => document.getElementById('catalog-results')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }), [])
  useEffect(() => {
    if (!reveal.current || !results.data) return
    reveal.current = false
    revealResults()
  }, [results.data, revealResults])
  function filterWhileTyping(value: string) {
    clearTimeout(typing.current)
    typing.current = setTimeout(() => setParams(current => changeCatalogFilter(current, 'query', value), { replace: true }), 350)
  }
  useEffect(() => { if (params.has('buscar')) search.current?.focus() }, [params])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); clearTimeout(typing.current)
    const next = changeCatalogFilter(params, 'query', String(new FormData(event.currentTarget).get('query') || ''))
    // Typing may already have applied this search; then the results only need to be shown.
    if (next.toString() === params.toString()) revealResults()
    else { reveal.current = true; setParams(next) }
  }
  function applyCategory(value: string) { setParams(changeCatalogFilter(params, 'category', value)) }
  function changePage(value: number) { const next = new URLSearchParams(params); next.set('page', String(value)); setParams(next); document.getElementById('catalog-results')?.focus() }
  return <section className="collection-page page-shell">
    {location.state?.visitCompleted === true && <VisitQuiz/>}
    <div className="breadcrumb"><Link to="/">{ui.discover}</Link><span>/</span><span>{ui.collection}</span></div>
    <div className="collection-masthead"><p className="eyebrow">{ui.collectionModes}</p><h1>{ui.collectionHeading}<span className="accent-dot">.</span></h1><p>{ui.collectionIntro}</p></div>
    <div className="collection-toolbar"><form className="search-form" onSubmit={submit}><label className="sr-only" htmlFor="collection-query">{ui.searchCollection}</label><SearchIcon/><input ref={search} id="collection-query" name="query" type="search" maxLength={200} placeholder={ui.searchPlaceholder} defaultValue={query} onChange={event => filterWhileTyping(event.target.value)}/><button className="circle" type="submit" aria-label={ui.search}>→</button></form><button className="pill filter-toggle" ref={filterButton} onClick={() => { setDraftCategory(category); dialog.current?.showModal() }}>Temas {category ? '· 1' : '+'}</button></div>
    <nav className="filter-chips" aria-label={ui.collectionTopics}><button className={!category ? 'selected' : ''} aria-pressed={!category} onClick={() => applyCategory('')}>{ui.all}</button>{facets.data?.map(facet => <button className={category === facet.slug ? 'selected' : ''} aria-pressed={category === facet.slug} aria-label={`${facet.name} (${facet.element_count})`} key={facet.slug} onClick={() => applyCategory(facet.slug)}>{facet.name}<span>{facet.element_count}</span></button>)}</nav>
    <div className="collection-extra-filters">{collection && <button className="pill filter-tag" onClick={() => setParams(changeCatalogFilter(params, 'collection', ''))} aria-label={`${ui.removeFilter}: ${collectionName}`}>{ui.collection}: {collectionName} <span aria-hidden="true">×</span></button>}<Link className="underlined" to="/guia">{ui.askGuide} <Arrow/></Link></div><Status {...facets}/>
    {!query && !collection && (!category || category === 'mascaras') && <CollectionSpotlight/>}
    <dialog className="filter-dialog" ref={dialog} aria-labelledby="filter-title" onClose={() => filterButton.current?.focus()}><div className="menu-heading"><h2 id="filter-title">{ui.exploreTopics}</h2><button className="circle" aria-label={ui.closeFilters} onClick={() => dialog.current?.close()}>×</button></div><label className="filter-option"><input type="radio" name="topic" value="" checked={!draftCategory} onChange={() => setDraftCategory('')}/>{ui.allTopics}</label>{facets.data?.map(facet => <label className="filter-option" key={facet.slug}><input type="radio" name="topic" checked={draftCategory === facet.slug} onChange={() => setDraftCategory(facet.slug)}/>{facet.name}<span>{facet.element_count}</span></label>)}<div className="filter-dialog-actions"><button className="text-button" onClick={() => setDraftCategory('')}>{ui.clear}</button><button className="pill primary" onClick={() => { applyCategory(draftCategory); dialog.current?.close() }}>{ui.applyFilters}</button></div></dialog>
    <div id="catalog-results" className="collection-results" tabIndex={-1} aria-busy={results.loading}><div className="results-heading"><p aria-live="polite">{results.loading ? 'Buscando…' : results.data ? `${results.data.total} ${results.data.total === 1 ? 'pieza' : 'piezas'}${query ? ` para «${query}»` : ''}${category ? ` · ${facets.data?.find(facet => facet.slug === category)?.name || category}` : ''}` : ''}</p>{(query || category || collection) && <button className="text-button" onClick={() => setParams(new URLSearchParams())}>{ui.clearSearch}</button>}</div><Status {...results}/>
      {results.data?.items.length === 0 && <div className="empty-state"><h2>{ui.tryAnotherWord}</h2><p>{ui.noResults}</p><button className="pill dark" onClick={() => setParams(new URLSearchParams())}>{ui.viewCollection}</button></div>}
      <div className="collection-list">{results.data?.items.map((item, index) => <CollectionEntry key={item.slug} item={item} index={(page - 1) * catalogPageSize + index}/>)}</div>
      {results.data && results.data.total > catalogPageSize && <nav className="pagination" aria-label={ui.collectionPages}><button className="circle" aria-label={ui.previousPage} disabled={page <= 1} onClick={() => changePage(page - 1)}>←</button><span>{page} / {Math.ceil(results.data.total / catalogPageSize)}</span><button className="circle" aria-label={ui.nextPage} disabled={results.data.offset + results.data.limit >= results.data.total} onClick={() => changePage(page + 1)}>→</button></nav>}
    </div>
  </section>
}

function CollectionSpotlight() {
  const location = useLocation()
  const masks = useData(useCallback((signal: AbortSignal) => api.catalog(new URLSearchParams('schema_version=1&limit=24&offset=0&category=mascaras'), signal), []))
  const [selected, setSelected] = useState(0)
  const items = masks.data?.items || []
  const record = useRecord(items[selected]?.slug || presentation.featuredElementSlug)
  const model = record.data?.resources?.find(resource => resource.kind === 'model_3d')
  const poster = record.data?.resources?.find(resource => resource.kind === 'image')
  return <section className="collection-showcase" aria-label={ui.lookAtMasks}><div className="showcase-label"><span className="eyebrow">{ui.lookCloser}</span>{items.length > 0 && <span>{String(selected + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>}</div><div className="showcase-stage">{model ? <ModelStage key={model.id} resource={model} title={record.data!.title} poster={poster && api.resourceUrl(record.data!.slug, poster.id)}/> : <Status {...record}/>}</div><div className="showcase-caption"><p className="eyebrow">{record.data?.community?.name} · {record.data?.category?.name}</p><h2>{record.data?.title}</h2>{record.data && <Link className="pill secondary" to={`/elementos/${record.data.slug}`} state={{ from: location.pathname + location.search }}>{ui.openDetail} <Arrow/></Link>}<div className="showcase-switch"><button className="circle" aria-label={ui.previousMask} disabled={items.length < 2} onClick={() => setSelected(value => (value - 1 + items.length) % items.length)}>←</button><button className="circle" aria-label={ui.nextMask} disabled={items.length < 2} onClick={() => setSelected(value => (value + 1) % items.length)}>→</button></div></div><Status error={masks.error} retry={masks.retry}/></section>
}

function CollectionEntry({ item, index }: { item: CatalogItem; index: number }) {
  const location = useLocation()
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const thumbnail = item.thumbnail_resource_id && failedImage !== item.thumbnail_resource_id ? item.thumbnail_resource_id : null
  return <Link className={`collection-entry ${item.has_3d_model ? 'has-model' : ''}`} to={`/elementos/${item.slug}`} state={{ from: location.pathname + location.search }}><span className="entry-number">{String(index + 1).padStart(2, '0')}</span>{thumbnail && <img className="entry-thumbnail" src={api.resourceUrl(item.slug, thumbnail)} alt="" width="128" height="96" loading="lazy" decoding="async" onError={() => setFailedImage(thumbnail)}/>}<div className="entry-content"><p className="eyebrow">{item.category?.name || ui.museumFallback}{item.community ? ` · ${item.community}` : ''}</p><h2>{item.title}</h2><p>{item.description}</p><div className="entry-media">{item.has_3d_model && <span>{ui.modelAvailable}</span>}{item.has_narration && <span>{ui.narrationAvailable}</span>}<span>{ui.textSources}</span></div></div><span className="entry-action circle" aria-hidden="true"><Arrow/></span></Link>
}
