import { useState } from 'react'
import type { Resource } from './contracts'
import { ModelViewer } from './ModelViewer'
import { webModelResourceId } from './model-controls'
import { copy } from './interface-copy'

export function ModelSection({ resource, title, index, embedded = false }: { resource: Resource; title: string; index: number; embedded?: boolean }) {
  const [open, setOpen] = useState(false)
  const available = !!webModelResourceId(resource)
  const Heading = embedded ? 'h3' : 'h2'
  return <section className="model-section">
    <Heading>{copy.common.model} {index + 1}</Heading>
    {!available ? <p>{copy.common.noWebModel}</p> : <>
      {!open && <div className="model-placeholder"><span aria-hidden="true">3D</span><p>{copy.detail.viewHelp}</p></div>}
      <button className="button primary" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? copy.common.closeModel : copy.common.inspect}</button>
      {open && <ModelViewer resource={resource} title={title} />}
    </>}
    {resource.credit && <p>{copy.common.credit}: {resource.credit}</p>}
    {resource.provenance && <p>{copy.common.provenance}: {resource.provenance}</p>}
  </section>
}
