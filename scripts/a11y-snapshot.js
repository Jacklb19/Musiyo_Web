// Browser snippet: partial automated WCAG 2.2 checks for the current page (paste or inject; returns JSON).
// It complements, and never replaces, manual keyboard, screen-reader and expert review.
(() => {
  const visible = element => {
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0
  }
  const parse = value => { const m = value.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(',').map(Number); return { r, g, b, a } }
  const luminance = ({ r, g, b }) => { const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const background = element => {
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (style.backgroundImage !== 'none') return null
      const color = parse(style.backgroundColor)
      if (color && color.a > 0.95) return color
    }
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }
  }
  const name = element => (element.getAttribute('aria-label') || (element.getAttribute('aria-labelledby') || '').split(' ')
    .map(id => document.getElementById(id)?.textContent || '').join(' ') || (element.labels?.[0]?.textContent) || element.getAttribute('title')
    || element.getAttribute('alt') || element.textContent || '').trim()
  const describe = element => element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + (element.className && typeof element.className === 'string' ? '.' + element.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
  const issues = []
  const report = (criterion, element, detail) => issues.push({ criterion, element: element ? describe(element) : null, detail })
  if (!document.documentElement.lang) report('3.1.1', null, 'missing html lang')
  if (!document.title.trim()) report('2.4.2', null, 'missing title')
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible)
  if (headings.filter(h => h.tagName === 'H1').length !== 1) report('1.3.1', null, `h1 count ${headings.filter(h => h.tagName === 'H1').length}`)
  headings.reduce((previous, heading) => { const level = Number(heading.tagName[1]); if (level > previous + 1) report('1.3.1', heading, `heading jumps h${previous}->h${level}`); return level }, 0)
  document.querySelectorAll('img').forEach(image => { if (!image.hasAttribute('alt')) report('1.1.1', image, 'img without alt') })
  const interactive = [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[role=button],[tabindex]:not([tabindex="-1"])')].filter(visible)
  interactive.forEach(element => {
    if (element.type === 'hidden') return
    if (!name(element) && !(element.type === 'file')) report('4.1.2', element, 'no accessible name')
    const box = element.getBoundingClientRect()
    const inline = element.tagName === 'A' && getComputedStyle(element).display === 'inline' && element.closest('p,li')
    if (!inline && (box.width < 24 || box.height < 24)) report('2.5.8', element, `target ${Math.round(box.width)}x${Math.round(box.height)}`)
  })
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id)
  ids.filter((id, i) => ids.indexOf(id) !== i).forEach(id => report('4.1.1/1.3.1', null, `duplicate id ${id}`))
  const seen = new Set()
  document.querySelectorAll('body *').forEach(element => {
    if (!visible(element) || ![...element.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return
    const style = getComputedStyle(element)
    const fg = parse(style.color), bg = background(element)
    if (!fg || !bg) return
    const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
    const ratio = (l1 + 0.05) / (l2 + 0.05)
    const size = parseFloat(style.fontSize), bold = Number(style.fontWeight) >= 700
    const large = size >= 24 || (bold && size >= 18.66)
    const key = describe(element) + ratio.toFixed(2)
    if (ratio < (large ? 3 : 4.5) && !seen.has(key)) { seen.add(key); report('1.4.3', element, `contrast ${ratio.toFixed(2)} at ${size}px "${element.textContent.trim().slice(0, 40)}"`) }
  })
  document.querySelectorAll('video').forEach(video => { if (!video.querySelector('track[kind=captions],track[kind=subtitles]')) report('1.2.2', video, 'video without captions track') })
  let unfocusedOutline = 0
  interactive.slice(0, 60).forEach(element => {
    const before = getComputedStyle(element); const plain = before.outlineStyle + before.boxShadow + before.outlineWidth
    element.focus({ preventScroll: true })
    const after = getComputedStyle(element)
    if (document.activeElement === element && after.outlineStyle + after.boxShadow + after.outlineWidth === plain && after.outlineStyle === 'none') unfocusedOutline++
  })
  document.activeElement?.blur()
  if (unfocusedOutline) report('2.4.7', null, `${unfocusedOutline} focusable elements show no outline/box-shadow change with programmatic focus (verify :focus-visible manually)`)
  return { url: location.pathname, viewport: `${innerWidth}x${innerHeight}`, interactive: interactive.length, issues }
})()
