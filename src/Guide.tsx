import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from './api'
import type { GuideResponse } from './contracts'
import { GuideRequestError } from './guide-client'
import { copy } from './interface-copy'

export function Guide({ elementSlug, embedded = false }: { elementSlug?: string; embedded?: boolean } = {}) {
  const [params] = useSearchParams()
  const element = elementSlug || params.get('element')
  // Changing the selected record unmounts the request state and cancels its request.
  return <GuideQuestionForm key={element || ''} embedded={embedded} element={element && /^\S{1,100}$/.test(element) ? element : null} />
}

function GuideQuestionForm({ element, embedded }: { element: string | null; embedded: boolean }) {
  const [question, setQuestion] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<GuideResponse | null>(null)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const length = question.trim().length
  useEffect(() => () => request.current?.abort(), [])

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (length < 3 || length > 500 || pending) return
    const controller = new AbortController()
    request.current?.abort()
    request.current = controller
    setPending(true)
    setResult(null)
    setError('')
    setSubmitted(question.trim())
    try {
      const response = await api.guideQuestion({ schema_version: 1, question: question.trim(), element_slug: element }, controller.signal)
      if (!controller.signal.aborted) setResult(response)
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof GuideRequestError
        ? copy.guide.requestError(failure.status, failure.retryAfterSeconds ?? 60) : copy.guide.transportError)
    } finally {
      if (!controller.signal.aborted) setPending(false)
    }
  }

  function cancel() {
    request.current?.abort()
    setPending(false)
    setSubmitted('')
  }

  const Heading = embedded ? 'h2' : 'h1'
  return <section className={embedded ? "guide embedded-guide" : "page guide-page"}>
    <p className="eyebrow">{copy.guide.eyebrow}</p><Heading>{copy.guide.title}</Heading>
    <p className="page-intro">{copy.guide.intro}</p>
    <div className="guide-reading">
      {element && <div className="guide-context"><p>{copy.guide.context}</p>
        <Link to={'/elementos/' + encodeURIComponent(element)}>{copy.common.openDetail}</Link>
        <Link to="/guia">{copy.guide.clearContext}</Link></div>}
      <form className="guide-form" onSubmit={submit} aria-busy={pending}>
        <label htmlFor="guide-question">{copy.guide.question}</label>
        <textarea id="guide-question" value={question} rows={4} maxLength={500} readOnly={pending}
          aria-describedby="guide-question-hint" onChange={event => {
            setQuestion(event.target.value); setResult(null); setError(''); setSubmitted('')
          }} required />
        <div className="guide-form-footer"><p id="guide-question-hint" className="field-hint">{copy.guide.hint}</p>
          <span className="guide-count" aria-hidden="true">{question.length}/500</span></div>
        <div className="actions"><button className="button primary" type="submit" disabled={pending || length < 3 || length > 500}>
          {pending ? copy.guide.pending : copy.guide.submit}</button>
          {pending && <button className="button secondary" type="button" onClick={cancel}>{copy.guide.cancel}</button>}</div>
      </form>
      <div className="guide-feedback" aria-live="polite" aria-atomic="true">
        {pending && <p className="status">{copy.guide.pending}</p>}
        {error && <p className="status error" role="alert">{error}</p>}
        {result && <section className="guide-answer" aria-labelledby="guide-answer-title">
          <p className="guide-submitted">{submitted}</p>
          <h2 id="guide-answer-title">{copy.guide.resultTitle(result.status)}</h2>
          {result.status === 'answered' ? <><p className="guide-answer-text">{result.answer}</p>
            <h3>{copy.guide.sources}</h3><ul className="guide-citations">{result.citations.map(citation => <li key={citation.element_slug}>
              <Link to={'/elementos/' + encodeURIComponent(citation.element_slug)}>{citation.title} <span aria-hidden="true">↗</span></Link>
            </li>)}</ul><p className="field-hint">{copy.guide.sourceHint}</p></>
            : <p>{result.status === 'abstained' ? copy.guide.abstained : copy.guide.unavailable}</p>}
        </section>}
      </div>
    </div>
    <nav className="guide-alternatives" aria-label={copy.guide.alternatives}>
      <Link className="button secondary" to="/catalogo">{copy.site.catalog}</Link>
      <Link className="button secondary" to="/recorrido">{copy.site.tour}</Link>
      <Link className="button secondary" to="/recorrido/texto">{copy.home.textTour}</Link>
    </nav>
  </section>
}
