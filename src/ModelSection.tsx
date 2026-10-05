import { useState } from 'react'
import type { Resource } from './contracts'
import { ModelViewer } from './ModelViewer'
import { webModelResourceId } from './model-controls'

export function ModelSection({ resource, title, index }: { resource: Resource; title: string; index: number }) {
  const [open, setOpen] = useState(false)
  const available = !!webModelResourceId(resource)
  return <section className="model-section">
    <h2>Modelo 3D {index + 1}</h2>
    {!available ? <p>No hay una variante de este modelo disponible para la Web.</p> : <>
      <button className="button secondary" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? 'Cerrar modelo 3D' : 'Ver modelo 3D'}</button>
      {open && <ModelViewer resource={resource} title={title} />}
    </>}
    {resource.credit && <p>Crédito: {resource.credit}</p>}
    {resource.provenance && <p>Procedencia: {resource.provenance}</p>}
  </section>
}
