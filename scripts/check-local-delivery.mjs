import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Bounded local HTTP checks; never loads the Unity runtime or traverses the museum.
export async function checkDelivery(origin, visitors = 20) {
  const base = new URL(origin)
  if (!['http:', 'https:'].includes(base.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
    || base.username || base.password || base.pathname !== '/' || base.search || base.hash
    || !Number.isInteger(visitors) || visitors < 1 || visitors > 20) throw new Error('Select a loopback origin and 1..20 visitors')
  const checks = []
  async function read(path, { method = 'GET', headers = {} } = {}) {
    const response = await fetch(new URL(path, base), { method, headers, signal: AbortSignal.timeout(15000), redirect: 'error' })
    return response
  }
  for (const path of ['/guia', '/catalogo', '/recorrido/texto']) {
    const response = await read(path)
    checks.push({ path, passed: response.status === 200 && (response.headers.get('content-type') || '').includes('text/html') })
    await response.body?.cancel()
  }
  const response = await read('/unity/museum-build-manifest.json')
  const manifest = await response.json()
  if (response.status !== 200 || manifest.schema_version !== 1 || !manifest.files) throw new Error('A closed museum build manifest is required')
  for (const [key, expected] of Object.entries(manifest.files)) {
    if (key.includes('..') || key.startsWith('/') || key.includes('\\')) throw new Error('Invalid player manifest path')
    const file = await read('/unity/' + key)
    const digest = createHash('sha256')
    let bytes = 0
    if (file.body) for await (const chunk of file.body) { digest.update(chunk); bytes += chunk.length }
    checks.push({ path: '/unity/' + key, passed: file.status === 200 && bytes === expected.bytes && digest.digest('hex') === expected.sha256 })
  }
  const wasmKey = Object.keys(manifest.files).find(key => key.endsWith('.wasm'))
  if (wasmKey) {
    const head = await read('/unity/' + wasmKey, { method: 'HEAD' })
    checks.push({ path: 'wasm_mime', passed: head.headers.get('content-type')?.split(';')[0] === 'application/wasm' })
  }
  const missing = await read('/unity/Build/missing-delivery-check.wasm')
  checks.push({ path: 'missing_player_file', passed: missing.status === 404 })
  await missing.body?.cancel()
  const started = performance.now()
  const timings = await Promise.all(Array.from({ length: visitors }, async () => {
    const begin = performance.now()
    for (const path of ['/api/v1/ready', '/api/v1/elements', '/api/v1/tours/museum-main?schema_version=1']) {
      const result = await read(path)
      if (result.status !== 200) throw new Error('Local visitor request failed')
      await result.arrayBuffer()
    }
    return performance.now() - begin
  }))
  return { schema_version: 1, state: checks.every(check => check.passed) ? 'passed_local_checks' : 'failed_local_checks',
    source_commit: manifest.source_commit, checks,
    load: { visitors, requests: visitors * 3, seconds: (performance.now() - started) / 1000,
      maximum_visitor_ms: Math.max(...timings), note: 'One bounded local burst of reads; not GPU, guide, CDN or sustained capacity acceptance.' } }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(process.argv[3] || '')
  const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const path = relative(workspace, output)
  if (!process.argv[2] || !process.argv[3] || !(isAbsolute(path) || path === '..' || path.startsWith('..' + sep))) throw new Error('Select an origin and new external report path')
  const report = await checkDelivery(process.argv[2])
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ state: report.state, source_commit: report.source_commit, load: report.load }))
  if (report.state !== 'passed_local_checks') process.exitCode = 1
}
