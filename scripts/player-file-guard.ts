import { existsSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Vite's SPA fallback must not return HTML for a missing player binary.
export function playerFileGuard(directory: string) {
  const root = existsSync(directory) ? realpathSync(directory) : resolve(directory)
  return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = (request.url || '').split('?')[0]
    if (path !== '/unity' && !path.startsWith('/unity/')) return next()
    let available = false
    try {
      const suffix = decodeURIComponent(path.slice('/unity'.length))
      const file = resolve(root, '.' + (suffix === '' || suffix === '/' ? '/index.html' : suffix))
      if (existsSync(file)) {
        const local = relative(root, realpathSync(file))
        available = !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep) && statSync(file).isFile()
      }
    } catch { /* Invalid encodings and filesystem errors are unavailable resources. */ }
    if (available) return next()
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.end(request.method === 'HEAD' ? undefined : 'Not found')
  }
}
