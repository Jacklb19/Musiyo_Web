// Generated from contracts/openapi.json by scripts/generate-contracts.mjs.
export interface CatalogFacet {
  slug: string
  name: string
  element_count: number
}

export interface CatalogItem {
  slug: string
  title: string
  community?: string | null
  thumbnail_resource_id?: string | null
  has_3d_model?: boolean
  has_narration?: boolean
  description: string
  category?: NamedTerm | null
}

export interface CatalogPage {
  schema_version: 1
  items: (CatalogItem)[]
  total: number
  limit: number
  offset: number
}

export interface ClearedSelectionData {
  tour_key: string
}

export interface Community {
  name: string
  people: string
}

export interface Credit {
  role?: string | null
  name: string
}

export interface DetailCorrection {
  title?: string | null
  description?: string | null
  interpretations?: (InterpretationCorrection)[]
}

export interface Element {
  slug: string
  language?: "es"
  title: string
  description: string
  community?: Community | null
  category?: NamedTerm | null
  collections?: (NamedTerm)[]
  technique?: string | null
  materials?: (string)[]
  blocks?: (TextBlock)[]
  sources?: (Source)[]
  credits?: (Credit)[]
  restrictions?: (Restriction)[]
  resources?: (Resource)[]
  last_modified?: LastModified | null
}

export interface ElementSummary {
  slug: string
  title: string
  community?: string | null
  thumbnail_resource_id?: string | null
  has_3d_model?: boolean
  has_narration?: boolean
}

export interface Guide {
  key: string
  name: string
  room_key: string
  available: boolean
}

export interface Health {
  status: "ok"
}

export interface InterpretationCorrection {
  block_id: string
  text: string
}

export interface LastModified {
  date: string
  author: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface NamedTerm {
  slug: string
  name: string
}

export interface Point {
  key: string
  name: string
  order: number
  activation: ("proximity" | "gaze" | "keyboard")[]
  elements: (ElementSummary)[]
}

export interface Problem {
  type: string
  title: string
  status: number
  code: "not_found" | "schema_incompatible" | "validation" | "service_unavailable" | "unauthenticated" | "forbidden" | "rate_limited"
  detail: string
}

export interface Resource {
  id: string
  kind: "model_3d" | "image" | "audio" | "video" | "narration" | "subtitles"
  mime: string
  byte_count?: number | null
  duration_seconds?: number | null
  alternative_text?: string | null
  credit?: string | null
  provenance?: string | null
  variants?: (ResourceVariant)[]
  transcription?: string | null
  subtitles_resource_id?: string | null
}

export interface ResourceAccess {
  schema_version: 1
  url: string
  expires_at: string
  mime: string
  byte_count?: number | null
  sha256?: string | null
}

export interface ResourceVariant {
  id: string
  profile: "web" | "quest"
}

export interface Restriction {
  kind: "no_download" | "no_reuse" | "other"
  description: string
}

export interface Room {
  key: string
  name: string
  order: number
  short_description?: string
  ambient_audio_resource_id?: string | null
  points: (Point)[]
}

export interface SelectionCleared {
  source: "musiyo-unity"
  type: "selection_cleared"
  version: 1
  data: ClearedSelectionData
}

export interface SelectionConfirmed {
  source: "musiyo-unity"
  type: "selection_confirmed"
  version: 1
  data: SelectionData
}

export interface SelectionData {
  tour_key: string
  point_key: string
  element_slug?: string | null
}

export interface Source {
  id: string
  kind: "publication" | "interview" | "other"
  reference: string
  url?: string | null
}

export interface TextBlock {
  id: string
  kind: "documented_fact" | "testimony" | "interpretation"
  text: string
  source_id?: string | null
  attribution?: string | null
  context?: string | null
}

export interface Tour {
  schema_version: 1
  tour: TourMetadata
  rooms: (Room)[]
  guide?: Guide | null
}

export interface TourMetadata {
  key: string
  name: string
  revision?: string | null
}

export interface ValidatorProfile {
  username: string
  name: string
}

export interface ValidatorSession {
  schema_version: 1
  authenticated: boolean
  user?: ValidatorProfile | null
  csrf_token?: string | null
}
