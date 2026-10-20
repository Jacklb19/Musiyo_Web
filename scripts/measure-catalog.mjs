// Cold-cache catalogue usability timing (RNF-03) with an installed Chromium browser over CDP.
// Each run uses a new temporary profile, so nothing is cached; the profile is deleted afterwards.
// "Usable" = results finished loading, at least one ficha link and the search field are visible.
// Usage: node scripts/measure-catalog.mjs --url http://localhost:4184/catalogo --browser <msedge.exe>
//          [--runs 3] [--network slow4g|fast4g|none] [--cpu 4] [--output NEW_EXTERNAL_FILE.json]
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

// Throughput in bytes/second; latency in ms. Values follow the common Lighthouse/DevTools presets.
export const NETWORK_PROFILES = {
  none: null,
  fast4g: { latency: 40, downloadThroughput: 10_000_000 / 8, uploadThroughput: 3_000_000 / 8 },
  slow4g: { latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 },
}

export const USABLE_CHECK = `(() => {
  const results = document.querySelector('#catalog-results')
  const entry = document.querySelector('#catalog-results .collection-list a.collection-entry')
  const search = document.querySelector('#collection-query')
  const visible = element => { if (!element) return false; const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 }
  return !!results && results.getAttribute('aria-busy') === 'false' && visible(entry) && visible(search) && !search.disabled
})()`

export function parseArguments(argv) {
  const options = { runs: 3, network: 'slow4g', cpu: 4, timeoutMs: 30000 }
  for (let index = 0; index < argv.length; index += 2) {
    const [key, value] = [argv[index], argv[index + 1]]
    if (value === undefined) throw new Error(`Missing value for ${key}`)
    if (key === '--url') options.url = value
    else if (key === '--browser') options.browser = value
    else if (key === '--runs') options.runs = Number(value)
    else if (key === '--network') options.network = value
    else if (key === '--cpu') options.cpu = Number(value)
    else if (key === '--output') options.output = value
    else throw new Error(`Unknown option ${key}`)
  }
  const url = new URL(options.url ?? '')
  if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol !== 'https:') throw new Error('Use a local or HTTPS URL')
  if (!options.browser || !existsSync(options.browser)) throw new Error('Select an installed Chromium browser executable')
  if (!Number.isInteger(options.runs) || options.runs < 1 || options.runs > 10) throw new Error('Select 1-10 runs')
  if (!(options.network in NETWORK_PROFILES)) throw new Error('Unknown network profile')
  if (!Number.isFinite(options.cpu) || options.cpu < 1 || options.cpu > 8) throw new Error('CPU slowdown must be 1-8')
  return options
}

function connect(url) {
  const socket = new WebSocket(url)
  let next = 0
  const pending = new Map()
  const listeners = []
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { ok, fail } = pending.get(message.id)
      pending.delete(message.id)
      message.error ? fail(new Error(message.error.message)) : ok(message.result)
    } else listeners.forEach(listener => listener(message))
  })
  const ready = new Promise((ok, fail) => { socket.addEventListener('open', ok); socket.addEventListener('error', fail) })
  return ready.then(() => ({
    send: (method, params = {}, sessionId) => new Promise((ok, fail) => {
      const id = ++next
      pending.set(id, { ok, fail })
      socket.send(JSON.stringify({ id, method, params, sessionId }))
    }),
    on: listener => listeners.push(listener),
    close: () => socket.close(),
  }))
}

async function measure(options, run) {
  const profile = await mkdtemp(join(tmpdir(), 'musiyo-measure-'))
  const browser = spawn(options.browser, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1280,800', 'about:blank'],
  { stdio: 'ignore' })
  try {
    let port
    for (let attempt = 0; attempt < 100 && !port; attempt++) {
      await sleep(100)
      port = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').then(text => text.split('\n')[0]).catch(() => undefined)
    }
    if (!port) throw new Error('Browser did not expose a debugging port')
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
    const cdp = await connect(version.webSocketDebuggerUrl)
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
    const send = (method, params) => cdp.send(method, params, sessionId)
    const requests = new Map()
    let bytes = 0, failed = 0
    cdp.on(message => {
      if (message.sessionId !== sessionId) return
      if (message.method === 'Network.requestWillBeSent') requests.set(message.params.requestId, message.params.request.url)
      if (message.method === 'Network.loadingFinished') bytes += message.params.encodedDataLength
      if (message.method === 'Network.loadingFailed' && !message.params.canceled) failed++
    })
    await send('Network.enable')
    await send('Network.setCacheDisabled', { cacheDisabled: true })
    const network = NETWORK_PROFILES[options.network]
    if (network) await send('Network.emulateNetworkConditions', { offline: false, ...network })
    if (options.cpu > 1) await send('Emulation.setCPUThrottlingRate', { rate: options.cpu })
    await send('Page.enable')
    await send('Runtime.enable')
    await send('Page.navigate', { url: options.url })
    let usableMs = null
    const deadline = Date.now() + options.timeoutMs
    while (Date.now() < deadline) {
      const result = await send('Runtime.evaluate', { expression: `${USABLE_CHECK} ? performance.now() : null`, returnByValue: true }).catch(() => null)
      if (typeof result?.result?.value === 'number') { usableMs = Math.round(result.result.value); break }
      await sleep(25)
    }
    const paint = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]
      const nav = performance.getEntriesByType('navigation')[0]
      return { first_contentful_paint_ms: fcp ? Math.round(fcp.startTime) : null,
               dom_content_loaded_ms: nav ? Math.round(nav.domContentLoadedEventEnd) : null }
    })()` })
    const requestCountAtUsable = requests.size, bytesAtUsable = bytes
    cdp.close()
    return { run, usable_ms: usableMs, usable_within_5s: usableMs !== null && usableMs <= 5000,
      ...paint.result.value, requests_at_usable: requestCountAtUsable, transferred_bytes_at_usable: bytesAtUsable, failed_requests: failed }
  } finally {
    browser.kill()
    await sleep(500)
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const results = []
  for (let run = 1; run <= options.runs; run++) results.push(await measure(options, run))
  const report = {
    schema_version: 1, measured_at: new Date().toISOString(), url: options.url,
    profile: { browser: options.browser, headless: true, cache: 'new empty profile per run, cache disabled',
      network: options.network, network_conditions: NETWORK_PROFILES[options.network], cpu_slowdown: options.cpu, viewport: '1280x800' },
    usable_definition: 'results not busy, first ficha link and search field visible and enabled',
    threshold_ms: 5000, runs: results, all_within_threshold: results.every(item => item.usable_within_5s),
    limits: 'Emulated network/CPU on the measuring computer; not a physical phone or a public deployment.',
  }
  if (options.output) {
    const output = resolve(options.output)
    if (existsSync(output)) throw new Error('Choose a new output file')
    await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  }
  console.log(JSON.stringify({ all_within_threshold: report.all_within_threshold, usable_ms: results.map(item => item.usable_ms) }))
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll('\\', '/')}` || import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
