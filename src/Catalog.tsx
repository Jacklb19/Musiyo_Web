import { useCallback, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from './api'
import { catalogPageSize, catalogRequest, changeCatalogFilter } from './catalog-params'
import { useApi } from './use-api'

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
  const category = request.get('category') || ''
  const collection = request.get('collection') || ''
  const page = Number(request.get('offset')) / catalogPageSize + 1

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
    <p className="eyebrow">Archivo / catálogo</p><h1>Elementos publicados</h1>
    <p className="page-intro">Explora las fichas por nombre, categoría o colección.</p>
    <form className="catalog-search" onSubmit={submit}>
      <label className="search-label" htmlFor="catalog-query">Buscar en el catálogo</label>
      <div className="search-controls"><input key={query} id="catalog-query" name="query" type="search" maxLength={200}
        placeholder="Título, técnica o contenido" defaultValue={query} /><button type="submit" className="button primary">Buscar</button></div>
    </form>
    <div className="catalog-filters">
      <label>Categoría<select value={category} disabled={facets.loading} onChange={(event) => setParams(changeCatalogFilter(params, 'category', event.target.value))}>
        <option value="">Todas las categorías</option>
        {category && !facets.data?.[0].some((term) => term.slug === category) && <option value={category}>Categoría no disponible</option>}
        {facets.data?.[0].map((term) => <option key={term.slug} value={term.slug}>{term.name} ({term.element_count})</option>)}
      </select></label>
      <label>Colección<select value={collection} disabled={facets.loading} onChange={(event) => setParams(changeCatalogFilter(params, 'collection', event.target.value))}>
        <option value="">Todas las colecciones</option>
        {collection && !facets.data?.[1].some((term) => term.slug === collection) && <option value={collection}>Colección no disponible</option>}
        {facets.data?.[1].map((term) => <option key={term.slug} value={term.slug}>{term.name} ({term.element_count})</option>)}
      </select></label>
      <button type="button" className="button secondary" onClick={() => setParams(new URLSearchParams())}>Limpiar filtros</button>
    </div>
    {facets.error && <p className="status error" role="alert">No fue posible cargar los filtros. <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></p>}
    <div id="catalog-results" tabIndex={-1} aria-busy={loading}>
      <p className="result-count" aria-live="polite" aria-atomic="true">{loading ? 'Buscando…' : data ? `${data.total} ${data.total === 1 ? 'resultado' : 'resultados'}` : ''}</p>
      {loading && <div className="catalog-skeleton" aria-hidden="true"><div /><div /><div /></div>}
      {error && <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></p>}
      {data && (data.items.length ? <div className="cards">{data.items.map((item) => <Link className="card" key={item.slug} to={'/elementos/' + encodeURIComponent(item.slug)}>
        {item.thumbnail_resource_id && <img className="card-thumbnail" src={api.resourceUrl(item.slug, item.thumbnail_resource_id)}
          alt="" loading="lazy" width="320" height="200" onError={(event) => { event.currentTarget.hidden = true }} />}
        <span className="section-num">{item.category?.name || 'Ficha'}</span><h2>{item.title}</h2>
        {item.community && <p className="card-community">{item.community}</p>}<p>{item.description}</p><span className="card-arrow" aria-hidden="true">↗</span>
      </Link>)}</div> : <div className="empty"><span className="empty-symbol" aria-hidden="true">◇</span><h2>No hay elementos que coincidan</h2><p>Prueba otra búsqueda o limpia los filtros.</p>
        {page > 1 && <button type="button" className="button secondary" onClick={() => changePage(1)}>Volver a la primera página</button>}</div>)}
      {data && data.total > catalogPageSize && <nav className="catalog-pagination" aria-label="Páginas del catálogo">
        <button type="button" className="button secondary" disabled={page <= 1} onClick={() => changePage(page - 1)}>Anterior</button>
        <span>Página {page} de {Math.ceil(data.total / catalogPageSize)}</span>
        <button type="button" className="button secondary" disabled={data.offset + data.limit >= data.total} onClick={() => changePage(page + 1)}>Siguiente</button>
      </nav>}
    </div>
  </section>
}
