import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import type { GuideQuiz, GuideQuizAnswerResult } from './contracts'
import { GuideRequestError } from './guide-client'
import { quizCopy as text } from './quiz-copy'
import { presentation } from './presentation-config'
import './visit-quiz.css'

export function VisitQuiz({ heading: Heading = 'h2' }: { heading?: 'h1' | 'h2' }) {
  const [open, setOpen] = useState(false)
  const start = useRef<HTMLButtonElement>(null)
  function close() { setOpen(false); requestAnimationFrame(() => start.current?.focus()) }
  return <section className="visit-quiz" aria-labelledby="visit-quiz-title">
    <p className="eyebrow">{text.eyebrow}</p><Heading id="visit-quiz-title">{text.title}</Heading><p>{text.intro}</p>
    <button ref={start} className="pill dark" aria-expanded={open} aria-controls="visit-quiz-content" hidden={open} onClick={() => setOpen(true)}>{text.start} <span aria-hidden="true">↗</span></button>
    {open && <div id="visit-quiz-content"><QuizQuestions/><button className="underlined quiz-close" onClick={close}>{text.close}</button></div>}
  </section>
}

function QuizQuestions() {
  const [quiz, setQuiz] = useState<GuideQuiz | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [index, setIndex] = useState(0)
  const [option, setOption] = useState('')
  const [answer, setAnswer] = useState<GuideQuizAnswerResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [retryAt, setRetryAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const request = useRef<AbortController | null>(null)
  const heading = useRef<HTMLLegendElement>(null)
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000))
  const question = quiz?.questions[index]
  useEffect(() => {
    if (!retryAt) return
    const timer = window.setInterval(() => { const instant = Date.now(); setNow(instant); if (instant >= retryAt) window.clearInterval(timer) }, 500)
    return () => window.clearInterval(timer)
  }, [retryAt])
  function failed(cause: unknown) {
    if (cause instanceof GuideRequestError && cause.status === 429) {
      setRetryAt(Date.now() + (cause.retryAfterSeconds || 60) * 1000); setNow(Date.now()); setError('')
    } else setError(cause instanceof GuideRequestError && cause.status === 404 ? text.unavailable : text.failure)
  }
  useEffect(() => {
    const controller = new AbortController(); request.current = controller
    api.quiz(presentation.tourKey, controller.signal).then(value => { if (!controller.signal.aborted) setQuiz(value) })
      .catch(cause => { if (!controller.signal.aborted) failed(cause) }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [attempt])
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { if (question) heading.current?.focus() }, [question])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!question || !option || busy || remaining) return
    request.current?.abort(); const controller = new AbortController(); request.current = controller
    setBusy(true); setError('')
    try {
      const value = await api.quizAnswer({ schema_version: 1, id: question.id, option_id: option }, controller.signal)
      if (!controller.signal.aborted) {
        if (value.citation.element_slug !== question.element_slug || value.source.id !== question.source_id) throw new Error('Unexpected quiz evidence')
        setAnswer(value)
      }
    } catch (cause) { if (!controller.signal.aborted) failed(cause) }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  function next() { setIndex(value => value + 1); setOption(''); setAnswer(null); setError('') }
  function reload() { request.current?.abort(); setQuiz(null); setIndex(0); setOption(''); setAnswer(null); setBusy(true); setError(''); setAttempt(value => value + 1) }
  return <div className="quiz-questions">
    {remaining > 0 && <output>{text.rateLimit(remaining)}</output>}
    {error && <div role="alert"><p>{error}</p><button className="pill secondary" disabled={busy || remaining > 0} onClick={reload}>{text.retry}</button></div>}
    {!quiz && busy && <output>{text.loading}</output>}
    {!quiz && !busy && !error && <button className="pill secondary" disabled={remaining > 0} onClick={reload}>{text.retry}</button>}
    {quiz && quiz.questions.length === 0 && <output>{text.empty}</output>}
    {quiz && quiz.questions.length > 0 && !question && <div aria-live="polite"><h3>{text.done}</h3><p>{text.doneText}</p><Link className="underlined" to="/catalogo">Volver al catálogo ↗</Link></div>}
    {question && <><p className="quiz-progress">{text.progress(index + 1, quiz!.questions.length)}</p>
      <form onSubmit={submit}><fieldset disabled={busy || !!answer || remaining > 0}><legend ref={heading} tabIndex={-1}>{question.text}</legend>
        {question.options.map(item => <label className="quiz-option" key={item.id}><input type="radio" name="quiz-option" value={item.id} checked={option === item.id} onChange={() => setOption(item.id)} required/><span>{item.text}</span></label>)}
      </fieldset>{!answer && <div className="quiz-actions"><button className="pill dark" disabled={!option || busy || remaining > 0}>{busy ? text.sending : text.check}</button><button className="underlined" type="button" disabled={busy} onClick={next}>{text.skip}</button></div>}</form>
      {answer && <div className="quiz-feedback" aria-live="polite"><h3>{answer.correct ? text.correct : text.incorrect}</h3><p>{answer.explanation}</p><details><summary>{text.evidence}</summary><blockquote>{answer.citation.quote}</blockquote><p>{answer.source.reference}</p></details><Link className="underlined" to={'/elementos/' + encodeURIComponent(answer.citation.element_slug)}>{text.source} ↗</Link></div>}
      {answer && <button className="pill dark" onClick={next}>{text.next} <span aria-hidden="true">→</span></button>}
    </>}
  </div>
}
