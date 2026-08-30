import { z } from 'zod'
import {
  type EmbedTheme,
  EMBED_PROVIDER,
  FIGMA_EMBED_DEFAULT_HEIGHT,
  FIGMA_EMBED_DEFAULT_WIDTH,
  FIGMA_EMBED_MAX_HEIGHT,
  FIGMA_EMBED_MAX_WIDTH,
  FIGMA_EMBED_MIN_HEIGHT,
  FIGMA_EMBED_MIN_WIDTH,
  FIGMA_RESOURCE_TYPE,
} from './constants'

const FIGMA_HOSTS: ReadonlySet<string> = new Set(['figma.com', 'www.figma.com', 'embed.figma.com'])
const FIGMA_RESOURCE_TYPES: ReadonlySet<string> = new Set(Object.values(FIGMA_RESOURCE_TYPE))
const FIGMA_RESOURCE_KEY_PATTERN = /^[A-Za-z0-9]{6,128}$/u
const FIGMA_NODE_ID_PATTERN = /^[A-Za-z0-9:_-]{1,100}$/u

export const figmaEmbedDescriptorSchema = z.object({
  schemaVersion: z.literal(1),
  provider: z.literal(EMBED_PROVIDER.FIGMA),
  resourceType: z.union([
    z.literal(FIGMA_RESOURCE_TYPE.DESIGN),
    z.literal(FIGMA_RESOURCE_TYPE.PROTOTYPE),
    z.literal(FIGMA_RESOURCE_TYPE.BOARD),
    z.literal(FIGMA_RESOURCE_TYPE.SLIDES),
    z.literal(FIGMA_RESOURCE_TYPE.DECK),
  ]),
  resourceKey: z.string().regex(FIGMA_RESOURCE_KEY_PATTERN),
  nodeId: z.string().regex(FIGMA_NODE_ID_PATTERN).optional(),
  title: z.string().trim().min(1).max(200),
  width: z.number().int().min(FIGMA_EMBED_MIN_WIDTH).max(FIGMA_EMBED_MAX_WIDTH).default(FIGMA_EMBED_DEFAULT_WIDTH),
  height: z.number().int().min(FIGMA_EMBED_MIN_HEIGHT).max(FIGMA_EMBED_MAX_HEIGHT),
}).strict().readonly()

export type FigmaEmbedDescriptor = z.infer<typeof figmaEmbedDescriptorSchema>

export interface ParseFigmaEmbedInput {
  readonly url: string
  readonly title: string
  readonly width?: number
  readonly height?: number
}

export type ParseFigmaEmbedResult =
  | { readonly ok: true, readonly value: FigmaEmbedDescriptor }
  | { readonly ok: false, readonly code: 'invalid_figma_url' }

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value.trim())
  }
  catch {
    return null
  }
}

export const parseFigmaEmbedInput = (input: ParseFigmaEmbedInput): ParseFigmaEmbedResult => {
  const url = parseUrl(input.url)
  if (
    !url
    || url.protocol !== 'https:'
    || !FIGMA_HOSTS.has(url.hostname.toLowerCase())
    || url.username.length > 0
    || url.password.length > 0
    || url.port.length > 0
  ) {
    return { ok: false, code: 'invalid_figma_url' }
  }

  const segments = url.pathname.split('/').filter(Boolean)
  const resourceType = segments[0]
  const resourceKey = segments[1]
  const nodeId = url.searchParams.get('node-id') ?? undefined
  const title = input.title.trim() || 'Материал Figma'
  const width = input.width ?? FIGMA_EMBED_DEFAULT_WIDTH
  const height = input.height ?? FIGMA_EMBED_DEFAULT_HEIGHT
  if (
    typeof resourceType !== 'string'
    || !FIGMA_RESOURCE_TYPES.has(resourceType)
    || typeof resourceKey !== 'string'
  ) {
    return { ok: false, code: 'invalid_figma_url' }
  }

  const parsed = figmaEmbedDescriptorSchema.safeParse({
    schemaVersion: 1,
    provider: EMBED_PROVIDER.FIGMA,
    resourceType,
    resourceKey,
    ...(nodeId ? { nodeId } : {}),
    title,
    width,
    height,
  })
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, code: 'invalid_figma_url' }
}

export const buildFigmaEmbedUrl = (descriptor: FigmaEmbedDescriptor, theme: EmbedTheme): string => {
  const url = new URL(`https://embed.figma.com/${descriptor.resourceType}/${descriptor.resourceKey}`)
  url.searchParams.set('embed-host', 'minerva')
  if (descriptor.nodeId) url.searchParams.set('node-id', descriptor.nodeId)
  url.searchParams.set('theme', theme)
  return url.toString()
}

export const buildFigmaExternalUrl = (descriptor: FigmaEmbedDescriptor): string => {
  const url = new URL(`https://www.figma.com/${descriptor.resourceType}/${descriptor.resourceKey}`)
  if (descriptor.nodeId) url.searchParams.set('node-id', descriptor.nodeId)
  return url.toString()
}

export const parseFigmaEmbedDescriptor = (value: unknown): FigmaEmbedDescriptor | null => {
  const parsed = figmaEmbedDescriptorSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
