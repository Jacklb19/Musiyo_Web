// One tab title per page, so several open tabs stay distinguishable.
const site = 'Musiyo Bëtsknaté'
const titles: Record<string, string> = {
  '/': `${site} · Carnaval del Perdón`,
  '/catalogo': `Colección · ${site}`,
  '/recorrido': `Museo 3D · ${site}`,
  '/recorrido/texto': `Salas en texto · ${site}`,
  '/recorrido/cierre': `Junto al fogón · ${site}`,
  '/guia': `Pregúntale al guía · ${site}`,
  '/acerca': `Acerca del museo · ${site}`,
  '/privacidad': `Privacidad · ${site}`,
  '/creditos': `Créditos · ${site}`,
  '/validador': `Validadores · ${site}`,
}

export function pageTitle(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (titles[path]) return titles[path]
  if (path.startsWith('/elementos/')) return `Pieza · ${site}`
  if (path.startsWith('/validador/')) return titles['/validador']
  return `Página no encontrada · ${site}`
}
