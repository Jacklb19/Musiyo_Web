import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const path = (relative) => new URL(relative, root)
const manifest = readFileSync(path('contracts/source.sha256'), 'utf8').trim().split('\n')
for (const line of manifest) {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line.trim())
  if (!match) throw new Error('Invalid contract manifest')
  const digest = createHash('sha256').update(readFileSync(path('contracts/' + match[2]))).digest('hex')
  if (digest !== match[1]) throw new Error('Contract checksum mismatch: ' + match[2])
}

const openapi = JSON.parse(readFileSync(path('contracts/openapi.json'), 'utf8'))
const schemas = { ...openapi.components.schemas }
const bridge = JSON.parse(readFileSync(path('contracts/bridge.v1.schema.json'), 'utf8'))
Object.assign(schemas, bridge.$defs, { SelectionConfirmed: bridge })
const cleared = JSON.parse(readFileSync(path('contracts/bridge-clear.v1.schema.json'), 'utf8'))
Object.assign(schemas, cleared.$defs, { SelectionCleared: cleared })
const returned = JSON.parse(readFileSync(path('contracts/bridge-return.v1.schema.json'), 'utf8'))
Object.assign(schemas, returned.$defs, { ReturnToCatalog: returned })
const names = Object.keys(schemas).filter((name) => !['HTTPValidationError', 'ValidationError'].includes(name)).sort()
const typeOf = (property) => {
  if (property.$ref) return property.$ref.split('/').at(-1)
  if (property.anyOf) return property.anyOf.map(typeOf).join(' | ')
  if (property.type === 'array') return `(${typeOf(property.items)})[]`
  if (property.const !== undefined) return JSON.stringify(property.const)
  if (property.enum) return property.enum.map((value) => JSON.stringify(value)).join(' | ')
  if (property.minimum === 1 && property.maximum === 1) return '1'
  if (property.type === 'integer' || property.type === 'number') return 'number'
  if (property.type === 'string') return 'string'
  if (property.type === 'boolean') return 'boolean'
  if (property.type === 'null') return 'null'
  throw new Error('Unsupported contract type: ' + JSON.stringify(property))
}
let output = '// Generated from contracts/openapi.json by scripts/generate-contracts.mjs.\n'
for (const name of names) {
  const schema = schemas[name]
  if (!schema || schema.type !== 'object') throw new Error('Missing schema: ' + name)
  output += `export interface ${name} {\n`
  for (const [field, property] of Object.entries(schema.properties)) {
    const optional = schema.required?.includes(field) ? '' : '?'
    output += `  ${field}${optional}: ${typeOf(property)}\n`
  }
  output += '}\n\n'
}
output = output.trimEnd() + '\n'
const destination = path('src/contracts.ts')
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== output) throw new Error('Generated Web types are stale')
} else {
  writeFileSync(destination, output)
}
