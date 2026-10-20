import { useEffect, useRef, useState } from 'react'
import type { GuideVoiceAnswer } from './contracts'
import { speechBlob } from './voice-client'
import { voiceCopy } from './voice-copy'

export function GuideAnswerAudio({ answer }: { answer: GuideVoiceAnswer }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const player = audio.current
    const blob = speechBlob(answer)
    if (!player || !blob) return
    const url = URL.createObjectURL(blob)
    player.src = url
    return () => { player.pause(); player.removeAttribute('src'); player.load(); URL.revokeObjectURL(url) }
  }, [answer])
  return <>
    {/* The complete spoken text and its citations are visible directly above. */}
    {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
    <audio ref={audio} controls preload="none" aria-label={voiceCopy.audio} aria-describedby="guide-answer-text" onError={() => setFailed(true)} />
    {failed && <output>{voiceCopy.unavailable}</output>}
  </>
}
