import test from 'node:test'
import assert from 'node:assert/strict'
import { NETWORK_PROFILES, parseArguments } from '../scripts/measure-catalog.mjs'

test('catalogue measurement validates its documented profile before launching a browser', () => {
  const browser = process.execPath
  const options = parseArguments(['--url', 'http://127.0.0.1:4184/catalogo', '--browser', browser])
  assert.equal(options.runs, 3); assert.equal(options.network, 'slow4g'); assert.equal(options.cpu, 4)
  assert.equal(NETWORK_PROFILES.slow4g.latency, 150)
  for (const argv of [['--url', 'http://example.com/catalogo', '--browser', browser],
    ['--url', 'http://127.0.0.1/catalogo', '--browser', 'missing.exe'],
    ['--url', 'http://127.0.0.1/catalogo', '--browser', browser, '--runs', '0'],
    ['--url', 'http://127.0.0.1/catalogo', '--browser', browser, '--network', '3g'],
    ['--url', 'http://127.0.0.1/catalogo', '--browser', browser, '--unknown', 'x']]) assert.throws(() => parseArguments(argv))
})
