import { Link } from 'react-router-dom'
import { exhibitionCopy as ui } from './exhibition-copy'
import { Arrow } from './exhibition-ui'
import './downloads.css'

function downloadLink(value: string | undefined, extension: '.zip' | '.apk') {
  const target = value?.trim()
  if (!target || !(target.startsWith('/') || target.startsWith('https://'))) return null
  try {
    const url = new URL(target, window.location.origin)
    const local = target.startsWith('/') && url.origin === window.location.origin
    const secure = target.startsWith('https://') && url.protocol === 'https:'
    return (local || secure) && !url.username && !url.password && url.pathname.toLowerCase().endsWith(extension)
      ? url.href
      : null
  } catch {
    return null
  }
}

const editions = [
  {
    id: 'windows',
    title: 'Windows',
    format: 'PC de 64 bits · ZIP',
    description: 'Recorre el museo en tu computador con teclado y ratón.',
    steps: ['Extrae el contenido del ZIP en una carpeta.', 'Abre Musiyo.exe desde esa carpeta.'],
    href: () => downloadLink(import.meta.env.VITE_WINDOWS_DOWNLOAD_URL, '.zip'),
    label: 'Descargar para Windows',
  },
  {
    id: 'quest',
    title: 'Meta Quest',
    format: 'Realidad virtual · APK',
    description: 'Explora las salas en un visor Meta Quest con sus mandos.',
    steps: ['Activa el modo desarrollador del visor.', 'Conéctalo por USB e instala la APK con las herramientas de Meta.'],
    href: () => downloadLink(import.meta.env.VITE_QUEST_DOWNLOAD_URL, '.apk'),
    label: 'Descargar para Meta Quest',
  },
]

export function Downloads() {
  return (
    <section className="downloads-page page-shell" aria-labelledby="downloads-title">
      <div className="breadcrumb"><Link to="/">{ui.discover}</Link><span aria-hidden="true">/</span><span>{ui.downloads}</span></div>
      <header className="downloads-heading">
        <p className="eyebrow">{ui.museumName}</p>
        <h1 id="downloads-title">Descargas</h1>
        <p>Elige la versión del museo para tu computador o visor. La aplicación usa internet para consultar las fichas y conversar con el guía.</p>
      </header>

      <div className="download-editions">
        {editions.map(edition => {
          const href = edition.href()
          return (
            <article className="download-edition" key={edition.id} aria-labelledby={edition.id}>
              <p className="eyebrow">{edition.format}</p>
              <h2 id={edition.id}>{edition.title}</h2>
              <p>{edition.description}</p>
              <ol>{edition.steps.map(step => <li key={step}>{step}</li>)}</ol>
              {edition.id === 'quest' && (
                <a className="underlined download-instructions" href="https://developers.meta.com/vr/essentials/quick-start/">
                  Instrucciones de instalación de Meta
                </a>
              )}
              <div className="download-action">
                {href
                  ? <a className="pill dark" href={href} download>{edition.label}<span aria-hidden="true">↓</span></a>
                  : <p className="download-unavailable">Descarga aún no publicada</p>}
              </div>
            </article>
          )
        })}
      </div>

      <section className="download-online" aria-labelledby="download-online-title">
        <div>
          <h2 id="download-online-title">Visita en línea</h2>
          <p>Consulta las salas y sus fichas desde el navegador.</p>
        </div>
        <Link className="pill secondary visit-3d-link" to="/recorrido">Abrir museo 3D <Arrow/></Link>
        <Link className="pill secondary" to="/recorrido/texto">{ui.textRooms} <Arrow/></Link>
      </section>
    </section>
  )
}
