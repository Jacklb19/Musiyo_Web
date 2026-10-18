import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseQuiz, parseQuizAnswer } from '../src/contract-validation.ts'
import { requestQuiz, requestQuizAnswer } from '../src/quiz-client.ts'
import { GuideRequestError } from '../src/guide-client.ts'
const fixture = name => JSON.parse(readFileSync(new URL('../contracts/examples/' + name + '.json', import.meta.url), 'utf8'))

test('quiz v1 accepts canonical examples and hides incompatible repeated options', () => {
  const quiz = fixture('guide_quiz')
  assert.deepEqual(parseQuiz(quiz), quiz)
  assert.deepEqual(parseQuiz(fixture('guide_quiz_empty')).questions, [])
  for (const patch of [{schema_version: true}, {schema_version: 2}, {questions: [...quiz.questions, ...quiz.questions]}]) assert.throws(() => parseQuiz({...quiz, ...patch}))
  const duplicate = structuredClone(quiz)
  duplicate.questions[0].options[1].text = duplicate.questions[0].options[0].text.toUpperCase()
  assert.throws(() => parseQuiz(duplicate))
  const result = fixture('guide_quiz_answer_result')
  assert.deepEqual(parseQuizAnswer(result), result)
  assert.throws(() => parseQuizAnswer({...result, source: {...result.source, id: 'wrong-source'}}))
})

test('quiz requests only public versioned endpoints without caching and checks their context', async () => {
  const quiz = fixture('guide_quiz')
  const signal = new AbortController().signal
  const result = await requestQuiz('/api/v1', quiz.tour_key, signal, 15000, async (url, options) => {
    assert.equal(new URL(url, 'https://test.invalid').searchParams.get('tour_key'), quiz.tour_key)
    assert.equal(options.cache, 'no-store')
    return new Response(JSON.stringify({...quiz, room_key: null}))
  })
  assert.equal(result.tour_key, quiz.tour_key)
  await assert.rejects(requestQuiz('/api/v1', 'different-tour', signal, 15000, async () => new Response(JSON.stringify({...quiz, room_key:null}))))
  const answer = fixture('guide_quiz_answer')
  const response = fixture('guide_quiz_answer_result')
  assert.deepEqual(await requestQuizAnswer('/api/v1', answer, signal, 15000, async (url, options) => {
    assert.equal(url, '/api/v1/guide/quiz/answers')
    assert.deepEqual(JSON.parse(options.body), answer)
    return new Response(JSON.stringify(response))
  }), response)
  await assert.rejects(requestQuizAnswer('/api/v1', {...answer, id:'different-question'}, signal, 15000, async () => new Response(JSON.stringify(response))))
})

test('quiz throttling retains retry delay and cancelled responses are discarded', async () => {
  await assert.rejects(requestQuiz('/api/v1', 'test-tour', new AbortController().signal, 15000,
    async () => new Response('', {status:429,headers:{'Retry-After':'90'}})), error => error instanceof GuideRequestError && error.retryAfterSeconds===90)
  const controller = new AbortController()
  await assert.rejects(requestQuiz('/api/v1', 'test-tour', controller.signal, 15000,
    async () => ({ok:true,json:async()=>{controller.abort();return fixture('guide_quiz')}})), error => error.name==='AbortError')
})
