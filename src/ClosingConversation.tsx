import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { GuideSurvey } from './contracts'
import { surveyResponse } from './survey-client'
import { presentation } from './presentation-config'

type Mode = 'store' | 'local'
type Stage = 'loading' | 'hidden' | 'notice' | 'asking' | 'closing'

// Owner decision D6 (22-23/10/2026): after the interview the guide asks a few option-only questions, warm ones mixed
// with those the thesis needs. Answers leave the page only when the visitor chooses to keep them; a failure to load or
// to store never blocks the visit, it only hides the conversation or thanks the visitor all the same.
export function ClosingConversation() {
  const [survey, setSurvey] = useState<GuideSurvey | null>(null)
  const [stage, setStage] = useState<Stage>('loading')
  const [mode, setMode] = useState<Mode>('local')
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [reply, setReply] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)
  const heading = useRef<HTMLLegendElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    api.survey(presentation.tourKey, controller.signal)
      .then(value => { if (!controller.signal.aborted) { setSurvey(value); setStage('notice') } })
      .catch(() => { if (!controller.signal.aborted) setStage('hidden') })
    return () => controller.abort()
  }, [])
  useEffect(() => { if (stage === 'asking') heading.current?.focus() }, [stage, index])
  if (!survey || stage === 'loading' || stage === 'hidden') return null
  const question = survey.questions[index]
  function begin(choice: Mode) { setMode(choice); setStage('asking') }
  function finish(answers: Record<string, string>) {
    setStage('closing')
    if (mode !== 'store' || !survey) return
    const response = surveyResponse(survey, answers)
    if (!response.answers.length) return
    api.surveyResponse(response, new AbortController().signal).catch(() => setSaveFailed(true))
  }
  function answer(optionId: string | null) {
    const next = optionId ? { ...chosen, [question.id]: optionId } : chosen
    setChosen(next); setReply(optionId ? question.reply ?? '' : '')
    if (index + 1 < survey!.questions.length) setIndex(index + 1)
    else finish(next)
  }
  return <section className="closing-conversation" aria-labelledby="closing-conversation-title">
    <h3 id="closing-conversation-title" className="sr-only">{survey.notice.title}</h3>
    {stage === 'notice' && <div className="conversation-notice">
      <p className="conversation-line">{survey.notice.intro}</p>
      <div className="quiz-actions">
        <button className="pill dark" onClick={() => begin('store')}>{survey.notice.accept_label}</button>
        <button className="pill secondary" onClick={() => begin('local')}>{survey.notice.local_label}</button>
        <button className="underlined" onClick={() => setStage('hidden')}>{survey.notice.decline_label}</button>
      </div>
      <details className="conversation-more"><summary>{survey.notice.more_label}</summary><p>{survey.notice.text}</p></details>
    </div>}
    {stage === 'asking' && question && <div className="conversation-question">
      {reply && <p className="conversation-reply" aria-live="polite">{reply}</p>}
      <fieldset><legend ref={heading} tabIndex={-1} className="conversation-line">{question.text}</legend>
        <div className="conversation-options">
          {question.options.map(option => <button key={option.id} type="button" className="pill secondary" onClick={() => answer(option.id)}>{option.text}</button>)}
        </div>
      </fieldset>
      <div className="quiz-actions">
        {question.optional && <button className="underlined" type="button" onClick={() => answer(null)}>Pasar</button>}
        <button className="underlined" type="button" onClick={() => finish(chosen)}>Terminar aquí</button>
      </div>
    </div>}
    {stage === 'closing' && <p className="conversation-line" aria-live="polite">{survey.closing}
      {saveFailed && <span className="conversation-note"> (No pudimos guardar tus respuestas esta vez, pero gracias por contarnos.)</span>}</p>}
  </section>
}
