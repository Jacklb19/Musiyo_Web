export type Cue = { start: number; end: number; text: string }

export function parseTimedText(value: string): Cue[] {
  const blocks = value.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim().split(/\n\s*\n/)
  if (blocks.shift() !== 'WEBVTT') throw new Error('Invalid WebVTT header')
  const cues: Cue[] = []
  const stamp = '(?:(\\d{2,}):)?([0-5]\\d):([0-5]\\d)\\.(\\d{3})'
  const pattern = new RegExp(`^${stamp} --> ${stamp}$`)
  for (const block of blocks) {
    if (block.startsWith('NOTE')) continue
    const lines = block.split('\n')
    if (!lines[0]?.includes('-->')) lines.shift()
    const match = pattern.exec(lines.shift() || '')
    if (!match) throw new Error('Invalid WebVTT timing')
    const seconds = (i: number) => Number(match[i] || 0) * 3600 + Number(match[i + 1]) * 60 + Number(match[i + 2]) + Number(match[i + 3]) / 1000
    const cue = { start: seconds(1), end: seconds(5), text: lines.join(' ').trim() }
    if (!cue.text || cue.end <= cue.start || cue.start < (cues.at(-1)?.end ?? 0) || /<|-->/.test(cue.text)) throw new Error('Invalid plain-text cue')
    cues.push(cue)
  }
  if (!cues.length) throw new Error('Empty WebVTT')
  return cues
}

export function activeCue(cues: Cue[], seconds: number): number {
  return cues.findIndex(cue => seconds >= cue.start && seconds < cue.end)
}
