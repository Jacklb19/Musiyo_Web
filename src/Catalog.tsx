import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from './api'
import { catalogPageSize, catalogRequest, changeCatalogFilter } from './catalog-params'
import { useApi } from './use-api'
import { ElementCard } from './ElementCard'
import { copy } from './interface-copy'

export function Catalog() {
  const [params, setParams] = useSearchParams()
  const request = catalogRequest(params)
  const requestKey = request.toString()
  const [attempt, setAttempt] = useState(0)
  const load = useCallback((signal: AbortSignal) => {
    void attempt
    return api.catalog(new URLSearchParams(requestKey), signal)
  }, [requestKey, attempt])
  const loadFacets = useCallback((signal: AbortSignal) => {
    void attempt
    return Promise.all([api.categories(signal), api.collections(signal)])
  }, [attempt])
  const { data, error, loading } = useApi(load)
  const facets = useApi(loadFacets)
  const query = request.get('query') || ''
  const searchInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (searchInput.current) searchInput.current.value = query
  }, [query])
  const category = request.get('category') || ''
  const collection = request.get('collection') || ''
  const page = Number(request.get('offset')) / catalogPageSize + 1
  const hasFilters = !!(query || category || collection)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('query') || '')
    setParams(changeCatalogFilter(params, 'query', value))
  }
  function changePage(value: number) {
    const next = new URLSearchParams(params)
    if (value > 1) next.set('page', String(value))
    else next.delete('page')
    setParams(next)
    document.getElementById('catalog-results')?.focus()
  }

  return <section className="page catalog-page">
    <Link className="back" to="/">{copy.site.home} <span aria-hidden="true">/</span> {copy.site.catalog}</Link>
    <div className="catalog-heading"><div><p className="eyebrow">{copy.catalog.eyebrow}</p><h1>{copy.catalog.title}</h1><p className="page-intro">{copy.catalog.intro}</p></div>
      <form className="catalog-search" onSubmit={submit}><label className="search-label" htmlFor="catalog-query">{copy.catalog.search}</label>
        <div className="search-controls"><input ref={searchInput} id="catalog-query" name="query" type="search" maxLength={200} placeholder={copy.catalog.placeholder} defaultValue={query} /><button type="submit" className="button primary">{copy.catalog.submit}</button></div>
      </form>
    </div>
    <div className="catalog-layout"><aside className="catalog-filters" aria-labelledby="filter-heading"><h2 id="filter-heading">{copy.catalog.filters}</h2>
      <label>{copy.catalog.category}<select value={category} disabled={facets.loading} onChange={(event) => setParams(changeCatalogFilter(params, 'category', event.target.value))}>
        <option value="">{copy.catalog.allCategories}</option>
        {category && !facets.data?.[0].some((term) => term.slug === category) && <option value={category}>{copy.catalog.missingCategory}</option>}
        {facets.data?.[0].map((term) => <option key={term.slug} value={term.slug}>{term.name} ({term.element_count})</option>)}
      </select></label>
      <label>{copy.catalog.collection}<select value={collection} disabled={facets.loading} onChange={(event) => setParams(changeCatalogFilter(params, 'collection', event.target.value))}>
        <option value="">{copy.catalog.allCollections}</option>
        {collection && !facets.data?.[1].some((term) => term.slug === collection) && <option value={collection}>{copy.catalog.missingCollection}</option>}
        {facets.data?.[1].map((term) => <option key={term.slug} value={term.slug}>{term.name} ({term.element_count})</option>)}
      </select></label>
      <button type="button" className="button secondary" disabled={!hasFilters} onClick={() => setParams(new URLSearchParams())}>{copy.catalog.clear}</button>
      {facets.error && <p className="status error" role="alert">{copy.catalog.filterError} <button type="button" onClick={() => setAttempt((value) => value + 1)}>{copy.common.retry}</button></p>}
    </aside>
    <div id="catalog-results" tabIndex={-1} aria-busy={loading}>
      <p className="result-count" aria-live="polite" aria-atomic="true">{loading ? copy.catalog.searching : data ? copy.catalog.result(data.total) : ''}</p>
      <p className="catalog-note">{copy.catalog.note}</p>
      {loading && <div className="catalog-skeleton" aria-hidden="true"><div /><div /><div /></div>}
      {error && <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>{copy.common.retry}</button></p>}
      {data && (data.items.length ? <div className="cards">{data.items.map(item => <ElementCard key={item.slug} item={item} />)}</div> : <div className="empty"><span className="empty-symbol" aria-hidden="true">∅</span><h2>{copy.catalog.emptyTitle}</h2><p>{copy.catalog.emptyIntro}</p>
        <button type="button" className="button secondary" onClick={() => page > 1 ? changePage(1) : setParams(new URLSearchParams())}>{page > 1 ? copy.catalog.firstPage : copy.catalog.clear}</button></div>)}
      {data && data.total > catalogPageSize && <nav className="catalog-pagination" aria-label={copy.catalog.pagination}>
        <button type="button" className="button secondary" disabled={page <= 1} onClick={() => changePage(page - 1)}>{copy.catalog.previous}</button><span>{copy.catalog.page(page, Math.ceil(data.total / catalogPageSize))}</span>
        <button type="button" className="button secondary" disabled={data.offset + data.limit >= data.total} onClick={() => changePage(page + 1)}>{copy.catalog.next}</button>
      </nav>}
    </div></div>
  </section>
}
