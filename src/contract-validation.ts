import tourSchema from '../contracts/tour.v1.schema.json' with { type: 'json' }
import elementSchema from '../contracts/element.v1.schema.json' with { type: 'json' }
import bridgeSchema from '../contracts/bridge.v1.schema.json' with { type: 'json' }
import clearedSchema from '../contracts/bridge-clear.v1.schema.json' with { type: 'json' }
import catalogSchema from '../contracts/catalog.v1.schema.json' with { type: 'json' }
import facetSchema from '../contracts/catalog-facet.v1.schema.json' with { type: 'json' }
import accessSchema from '../contracts/resource-access.v1.schema.json' with { type: 'json' }
import sessionSchema from '../contracts/validator-session.v1.schema.json' with { type: 'json' }
import type { CatalogFacet, CatalogPage, Element, ResourceAccess, SelectionConfirmed, SelectionCleared, Tour, ValidatorSession } from './contracts.ts'

type Schema = {
  $ref?: string
  $defs?: Record<string, Schema>
  anyOf?: Schema[]
  type?: string
  const?: unknown
  enum?: unknown[]
  properties?: Record<string, Schema>
  required?: string[]
  additionalProperties?: boolean
  items?: Schema
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  pattern?: string
  format?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Supports the vocabulary emitted by the canonical Pydantic models.
function matches(value: unknown, schema: Schema, root: Schema): boolean {
  if (schema.$ref) return matches(value, root.$defs![schema.$ref.split('/').at(-1)!], root)
  if (schema.anyOf) return schema.anyOf.some((option) => matches(value, option, root))
  if ('const' in schema && value !== schema.const) return false
  if (schema.enum && !schema.enum.includes(value)) return false
  switch (schema.type) {
    case 'null': return value === null
    case 'object':
      return isRecord(value) && (schema.required || []).every((field) => field in value) &&
        Object.entries(value).every(([field, item]) => schema.properties?.[field]
          ? matches(item, schema.properties[field], root) : schema.additionalProperties !== false)
    case 'array':
      return Array.isArray(value) && value.length >= (schema.minItems || 0) &&
        value.length <= (schema.maxItems ?? Infinity) &&
        (!schema.uniqueItems || new Set(value.map((item) => JSON.stringify(item))).size === value.length) &&
        value.every((item) => matches(item, schema.items!, root))
    case 'string':
      return typeof value === 'string' && value.length >= (schema.minLength || 0) &&
        value.length <= (schema.maxLength ?? Infinity) &&
        (!schema.pattern || new RegExp(schema.pattern).test(value)) &&
        (schema.format !== 'date-time' || !Number.isNaN(Date.parse(value)))
    case 'integer':
      return typeof value === 'number' && Number.isSafeInteger(value) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity)
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity)
    case 'boolean': return typeof value === 'boolean'
    default: throw new Error('Unsupported contract schema vocabulary')
  }
}

export function parseTour(value: unknown): Tour {
  if (!matches(value, tourSchema as Schema, tourSchema as Schema)) {
    throw new Error('Versión o estructura de recorrido incompatible')
  }
  const contract = value as Tour
  const roomKeys = new Set<string>()
  const pointKeys = new Set<string>()
  let previousRoom = -1
  for (const room of contract.rooms) {
    if (roomKeys.has(room.key) || room.order <= previousRoom) throw new Error('Sala repetida o desordenada')
    roomKeys.add(room.key)
    previousRoom = room.order
    let previousPoint = -1
    for (const point of room.points) {
      if (pointKeys.has(point.key) || point.order <= previousPoint ||
          new Set(point.elements.map((item) => item.slug)).size !== point.elements.length) {
        throw new Error('Punto o elemento repetido o desordenado')
      }
      pointKeys.add(point.key)
      previousPoint = point.order
    }
  }
  if (contract.guide && !roomKeys.has(contract.guide.room_key)) throw new Error('Sala del guía desconocida')
  return contract
}

export function parseElement(value: unknown): Element {
  if (!matches(value, elementSchema as Schema, elementSchema as Schema)) throw new Error('Ficha incompatible')
  const contract = value as Element
  const sources = new Set((contract.sources || []).map((item) => item.id))
  const blocks = contract.blocks || []
  if (sources.size !== (contract.sources || []).length || new Set(blocks.map((item) => item.id)).size !== blocks.length ||
      blocks.some((block) => block.source_id && !sources.has(block.source_id))) throw new Error('Fuente de ficha incompatible')
  return contract
}

export function parseSelection(value: unknown): SelectionConfirmed | null {
  return matches(value, bridgeSchema as Schema, bridgeSchema as Schema) ? value as SelectionConfirmed : null
}

export function parseClearedSelection(value: unknown): SelectionCleared | null {
  return matches(value, clearedSchema as Schema, clearedSchema as Schema) ? value as SelectionCleared : null
}

export function parseCatalog(value: unknown): CatalogPage {
  if (!matches(value, catalogSchema as Schema, catalogSchema as Schema)) throw new Error('Catálogo incompatible')
  const page = value as CatalogPage
  if (new Set(page.items.map((item) => item.slug)).size !== page.items.length || page.items.length > page.limit ||
      page.items.length > Math.max(0, page.total - page.offset)) throw new Error('Paginación de catálogo incompatible')
  return page
}

export function parseFacets(value: unknown): CatalogFacet[] {
  if (!Array.isArray(value) || !value.every((item) => matches(item, facetSchema as Schema, facetSchema as Schema)) ||
      new Set(value.map((item: CatalogFacet) => item.slug)).size !== value.length) throw new Error('Filtros incompatibles')
  return value as CatalogFacet[]
}

export function parseResourceAccess(value: unknown): ResourceAccess {
  if (!matches(value, accessSchema as Schema, accessSchema as Schema)) throw new Error('Acceso a recurso incompatible')
  const access = value as ResourceAccess
  let url: URL
  try { url = new URL(access.url, 'https://api.invalid') } catch { throw new Error('URL de recurso incompatible') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('URL de recurso incompatible')
  return access
}

export function parseValidatorSession(value: unknown): ValidatorSession {
  if (!matches(value, sessionSchema as Schema, sessionSchema as Schema)) throw new Error('Sesión incompatible')
  const session = value as ValidatorSession
  if (session.authenticated !== (!!session.user && !!session.csrf_token) ||
      !session.authenticated && (session.user != null || session.csrf_token != null)) throw new Error('Estado de sesión incompatible')
  return session
}
