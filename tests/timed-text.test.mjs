import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activeCue, parseTimedText } from '../src/timed-text.ts'

test('cue selection follows media time through gaps, seeking, pause and repeat', () => {
  const cues = parseTimedText('WEBVTT\n\n1\n00:00:00.100 --> 00:00:01.000\nOne.\n\n00:00:01.500 --> 00:00:02.000\nTwo.')
  assert.deepEqual([0, .1, .9, 1, 1.5, 1.5, 2, .1].map(time => activeCue(cues, time)), [-1, 0, 0, -1, 1, 1, -1, 0])
})

test('invalid or unsafe timed text falls back instead of guessing timings', () => {
  for (const value of ['WEBVTT', 'x', 'WEBVTT\n\n00:00:01.000 --> 00:00:00.000\nx', 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n<b>x</b>',
    'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nx\n\n00:00:00.900 --> 00:00:02.000\ny']) assert.throws(() => parseTimedText(value))
})
