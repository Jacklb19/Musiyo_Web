import { useCallback, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from './api'
import type { Element } from './contracts'
import { useApi } from './use-api'
import { useValidatorSession } from './validator-session'
import { changedCorrection, correctionDraft, editableInterpretations } from './validator-correction'

function Login() {
  const { signIn } = useValidatorSession()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    setError('')
    try { await signIn(String(data.get('username') || ''), String(data.get('password') || '')) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión') }
    finally {
      const input = form.elements.namedItem('password')
      if (input instanceof HTMLInputElement) input.value = ''
      setBusy(false)
    }
  }
  return <div className="validator-login">
    <p>Ingresa con la cuenta que te entregó el responsable del museo.</p>
    <form className="validator-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor="validator-username">Usuario</label>
      <input id="validator-username" name="username" autoComplete="username" required maxLength={100} disabled={busy} />
      <label htmlFor="validator-password">Contraseña</label>
      <input id="validator-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={busy} />
      {error && <p className="status error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy} type="submit">{busy ? 'Ingresando…' : 'Iniciar sesión'}</button>
    </form>
  </div>
}

function CorrectionForm({ element }: { element: Element }) {
  const { session, expire } = useValidatorSession()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => correctionDraft(element))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const interpretations = editableInterpretations(element)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !session?.csrf_token) return
    setError('')
    try {
      const changes = changedCorrection(element, draft)
      if (!changes) { setError('No hay cambios para guardar.'); return }
      setBusy(true)
      await api.correct(element.slug, changes, session.csrf_token)
      navigate('/elementos/' + encodeURIComponent(element.slug), { replace: true })
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) expire()
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la corrección')
    } finally { setBusy(false) }
  }
  return <form className="validator-form" onSubmit={submit} aria-busy={busy}>
    <p>Corrige los textos de esta ficha. Sus fuentes, atribuciones y recursos se conservan.</p>
    <fieldset disabled={busy}>
      <legend className="visually-hidden">Textos de la ficha</legend>
      <label htmlFor="correction-title">Título</label>
      <input id="correction-title" required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} aria-describedby="title-limit" />
      <p id="title-limit" className="field-hint">{draft.title.length} / 160 caracteres</p>
      <label htmlFor="correction-description">Descripción</label>
      <textarea id="correction-description" rows={6} maxLength={5000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} aria-describedby="description-limit" />
      <p id="description-limit" className="field-hint">{draft.description.length} / 5000 caracteres</p>
      {interpretations.map((block, index) => <div className="interpretation-editor" key={block.id}>
        <label htmlFor={'interpretation-' + index}>Interpretación {index + 1}</label>
        {block.attribution && <p className="block-attribution">Según {block.attribution}</p>}
        {block.context && <p className="block-context">Contexto: {block.context}</p>}
        {block.source_id && <p className="block-source">Fuente: {element.sources?.find((source) => source.id === block.source_id)?.reference}</p>}
        <textarea id={'interpretation-' + index} required rows={6} maxLength={3000} value={draft.interpretations[block.id]} aria-describedby={'interpretation-limit-' + index}
          onChange={(event) => setDraft({ ...draft, interpretations: { ...draft.interpretations, [block.id]: event.target.value } })} />
        <p id={'interpretation-limit-' + index} className="field-hint">{draft.interpretations[block.id].length} / 3000 caracteres</p>
      </div>)}
      {!interpretations.length && <p>Esta ficha no contiene interpretaciones disponibles para corregir.</p>}
    </fieldset>
    {error && <p className="status error" role="alert">{error}</p>}
    <div className="validator-actions"><button className="button primary" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar corrección'}</button>
      {!busy && <Link className="button secondary" to={'/elementos/' + encodeURIComponent(element.slug)}>Cancelar</Link>}
    </div>
  </form>
}

function CorrectionEditor({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0)
  const load = useCallback((signal: AbortSignal) => {
    void attempt
    return api.element(id, signal)
  }, [id, attempt])
  const { data, error, loading } = useApi(load)
  return <>
    {loading && <output className="status">Cargando ficha…</output>}
    {error && <p className="status error" role="alert">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></p>}
    {data && <CorrectionForm key={data.slug} element={data} />}
  </>
}

export function Validator() {
  const { id } = useParams()
  const { session, loading, error, refresh, signOut } = useValidatorSession()
  const [exitError, setExitError] = useState('')
  const [exiting, setExiting] = useState(false)
  async function logout() {
    setExiting(true)
    setExitError('')
    try { await signOut() }
    catch (reason) { setExitError(reason instanceof Error ? reason.message : 'No fue posible cerrar la sesión') }
    finally { setExiting(false) }
  }
  return <section className="page validator-page">
    <p className="eyebrow">Responsables / corrección de fichas</p><h1>{id ? 'Corregir ficha' : 'Acceso de validadores'}</h1>
    {loading && <output className="status">Comprobando sesión…</output>}
    {!loading && error && <p className="status error" role="alert">{error} <button type="button" onClick={refresh}>Reintentar</button></p>}
    {!loading && !error && (session?.authenticated ? <>
      <div className="validator-session"><p>Sesión de {session.user?.name}</p><button type="button" className="button secondary" onClick={logout} disabled={exiting}>{exiting ? 'Cerrando…' : 'Cerrar sesión'}</button></div>
      {exitError && <p className="status error" role="alert">{exitError}</p>}
      {id ? <CorrectionEditor id={id} /> : <div className="ficha"><p className="lead">Selecciona una ficha publicada en el catálogo y pulsa «Corregir ficha».</p><Link className="button primary" to="/catalogo">Abrir catálogo</Link></div>}
    </> : <Login />)}
  </section>
}
