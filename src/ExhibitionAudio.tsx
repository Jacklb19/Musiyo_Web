import { exhibitionCopy as ui } from './exhibition-copy'
import type { Resource } from './contracts'
import { subtitlesFor } from './detail-content'
import { RecordedAudio } from './RecordedAudio'

export function ExhibitionAudio({ slug, resource, resources, title }: {
  slug: string; resource: Resource; resources: Resource[]; title: string
}) {
  return <div id="narrations">
    <RecordedAudio key={resource.id} element={slug} title={title} resource={resource}
      subtitles={subtitlesFor(resource, resources)} downloadRestricted appearance="exhibition"/>
    {resource.credit && <details className="audio-credits"><summary>{ui.credit}</summary><p className="media-credit">{resource.credit}</p></details>}
  </div>
}
