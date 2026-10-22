import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export function objectMetadata(key) {
  const encoding = key.endsWith('.br') ? 'br' : key.endsWith('.gz') ? 'gzip' : null
  const uncompressed = encoding ? key.slice(0, -3) : key
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm',
    '.data': 'application/octet-stream', '.unityweb': 'application/octet-stream', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' }[extname(uncompressed)] || 'application/octet-stream'
  const immutable = key.startsWith('assets/') && /[-.][A-Za-z0-9_-]{8,}\./.test(key)
  return { content_type: mime, content_encoding: encoding,
    cache_control: key.endsWith('unity-build.json') || key === 'index.html' ? 'no-store'
      : immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate' }
}

export function deploymentManifest(folder) {
  const root = resolve(folder)
  if (!existsSync(resolve(root, 'index.html'))) throw new Error('A completed Vite build is required')
  const objects = []
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const filename = resolve(path, entry.name)
      if (lstatSync(filename).isSymbolicLink()) throw new Error('Build symlinks are not supported')
      if (entry.isDirectory()) visit(filename)
      else if (entry.isFile()) {
        const key = relative(root, filename).split(sep).join('/')
        const bytes = readFileSync(filename)
        objects.push({ key, byte_count: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...objectMetadata(key) })
      }
    }
  }
  visit(root)
  const unity = objects.find(item => item.key === 'unity/unity-build.json')
  return { schema_version: 1, artifact_kind: 'web-build', state: 'prepared_not_uploaded',
    unity_manifest_sha256: unity?.sha256 || null, objects: objects.sort((a, b) => a.key.localeCompare(b.key)) }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const folder = process.argv[2] || 'dist'
  const manifest = deploymentManifest(folder)
  if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(manifest, null, 2) + '\n')
  else console.log(JSON.stringify(manifest, null, 2))
}
