import { exhibitionCopy as ui } from './exhibition-copy'

export function Arrow() { return <span aria-hidden="true">↗</span> }
export function SearchIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg> }
export function Status({ error, loading, retry }: { error: string; loading?: boolean; retry: () => void }) {
  if (error) return <div className="status" role="alert"><p>{error}</p><button className="pill secondary" onClick={retry}>{ui.retry}</button></div>
  return loading ? <output className="status">{ui.loading}</output> : null
}
