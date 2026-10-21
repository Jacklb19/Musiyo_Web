// Only one audio or video plays at a time: a guide answer pauses a narration and vice versa.
// 'play' does not bubble, so the listener uses the capture phase on the document.
interface MediaLike { paused: boolean; pause: () => void }
interface MediaDocument {
  addEventListener: (type: 'play', listener: (event: { target: unknown }) => void, capture: boolean) => void
  removeEventListener: (type: 'play', listener: (event: { target: unknown }) => void, capture: boolean) => void
  querySelectorAll: (selector: string) => ArrayLike<MediaLike>
}

export function installMediaExclusivity(root: MediaDocument): () => void {
  const listener = (event: { target: unknown }) => {
    for (const media of Array.from(root.querySelectorAll('audio, video'))) {
      if (media !== event.target && !media.paused) media.pause()
    }
  }
  root.addEventListener('play', listener, true)
  return () => root.removeEventListener('play', listener, true)
}
