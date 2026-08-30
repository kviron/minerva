import { z } from 'zod'
import type {
  DocumentContent,
  DocumentContentNode,
  DocumentJsonValue,
} from '../../../shared/documents/contracts'
import { parseFigmaEmbedDescriptor } from '../../../shared/embeds/figma'

const MAX_DOCUMENT_JSON_LENGTH = 1_000_000
const MAX_DOCUMENT_NODES = 10_000
const ALLOWED_NODE_TYPES: ReadonlySet<string> = new Set([
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
  'image',
  'table',
  'tableRow',
  'tableHeader',
  'tableCell',
  'externalEmbed',
])
const ALLOWED_MARK_TYPES: ReadonlySet<string> = new Set(['bold', 'italic', 'strike', 'underline', 'code', 'link'])
const SAFE_LINK_PATTERN = /^(?:https?:\/\/|mailto:|\/(?!\/))/u
const INTERNAL_DOCUMENT_LINK_PATTERN = /^document:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

const jsonValueSchema: z.ZodType<DocumentJsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema),
]))
const markSchema = z.object({
  type: z.string().min(1),
  attrs: z.record(z.string(), jsonValueSchema).optional(),
}).strict()
const nodeSchema: z.ZodType<DocumentContentNode> = z.lazy(() => z.object({
  type: z.string().min(1),
  attrs: z.record(z.string(), jsonValueSchema).optional(),
  content: z.array(nodeSchema).optional(),
  marks: z.array(markSchema).optional(),
  text: z.string().optional(),
}).strict())

const TABLE_CELL_TYPES: ReadonlySet<string> = new Set(['tableCell', 'tableHeader'])
const TABLE_CELL_ALIGNMENTS: ReadonlySet<string> = new Set(['left', 'center', 'right', 'justify'])

const validTableCellAttributes = (node: DocumentContentNode): boolean => {
  const colspan = node.attrs?.colspan ?? 1
  const rowspan = node.attrs?.rowspan ?? 1
  const colwidth = node.attrs?.colwidth ?? null
  const align = node.attrs?.align ?? null
  return typeof colspan === 'number'
    && Number.isInteger(colspan)
    && colspan >= 1
    && colspan <= 100
    && typeof rowspan === 'number'
    && Number.isInteger(rowspan)
    && rowspan >= 1
    && rowspan <= 100
    && (colwidth === null || (
      Array.isArray(colwidth)
      && colwidth.length === colspan
      && colwidth.every(width => typeof width === 'number' && Number.isInteger(width) && width >= 25 && width <= 10_000)
    ))
    && (align === null || (typeof align === 'string' && TABLE_CELL_ALIGNMENTS.has(align)))
}

const validTableStructure = (node: DocumentContentNode, parentType: string): boolean => {
  const children = node.content ?? []
  if (node.type === 'table') {
    return children.length > 0 && children.every(child => child.type === 'tableRow')
  }
  if (node.type === 'tableRow') {
    return parentType === 'table' && children.length > 0 && children.every(child => TABLE_CELL_TYPES.has(child.type))
  }
  if (TABLE_CELL_TYPES.has(node.type)) {
    return parentType === 'tableRow' && children.length > 0 && validTableCellAttributes(node)
  }
  return true
}

const documentContentStructureSchema: z.ZodType<DocumentContent> = z.object({
  type: z.literal('doc'),
  content: z.array(nodeSchema),
}).strict()

const validNodeTree = (nodes: readonly DocumentContentNode[]): boolean => {
  let nodeCount = 0
  const pending = nodes.map(node => ({ node, parentType: 'doc' }))
  while (pending.length > 0) {
    const entry = pending.pop()
    if (!entry) {
      continue
    }
    const { node, parentType } = entry
    nodeCount += 1
    if (
      nodeCount > MAX_DOCUMENT_NODES
      || !ALLOWED_NODE_TYPES.has(node.type)
      || !validTableStructure(node, parentType)
    ) {
      return false
    }
    if (node.type === 'text' && typeof node.text !== 'string') {
      return false
    }
    if (node.type === 'image') {
      const imageId = node.attrs?.imageId
      const alt = node.attrs?.alt
      const width = node.attrs?.width
      const height = node.attrs?.height
      if (
        typeof imageId !== 'string'
        || !UUID_PATTERN.test(imageId)
        || (alt !== undefined && (typeof alt !== 'string' || alt.length > 500))
        || (width !== undefined && width !== null && (
          typeof width !== 'number'
          || !Number.isInteger(width)
          || width < 160
          || width > 1600
        ))
        || (height !== undefined && height !== null && (
          typeof height !== 'number'
          || !Number.isInteger(height)
          || height < 90
          || height > 1600
        ))
        || node.content !== undefined
        || node.marks !== undefined
        || node.text !== undefined
      ) {
        return false
      }
    }
    if (
      node.type === 'externalEmbed'
      && (
        parseFigmaEmbedDescriptor(node.attrs) === null
        || node.content !== undefined
        || node.marks !== undefined
        || node.text !== undefined
      )
    ) {
      return false
    }
    for (const mark of node.marks ?? []) {
      if (!ALLOWED_MARK_TYPES.has(mark.type)) {
        return false
      }
      if (mark.type === 'link') {
        const href = mark.attrs?.href
        if (
          typeof href !== 'string'
          || href.length > 2048
          || (!SAFE_LINK_PATTERN.test(href) && !INTERNAL_DOCUMENT_LINK_PATTERN.test(href))
        ) {
          return false
        }
      }
    }
    pending.push(...(node.content ?? []).map(child => ({ node: child, parentType: node.type })))
  }
  return true
}

export const documentContentSchema: z.ZodType<DocumentContent> = documentContentStructureSchema.refine(content =>
  JSON.stringify(content).length <= MAX_DOCUMENT_JSON_LENGTH && validNodeTree(content.content))

export const extractInternalDocumentLinkTargetIds = (content: DocumentContent): readonly string[] => {
  const targetIds: string[] = []
  const seen = new Set<string>()
  const visit = (node: DocumentContentNode): void => {
    for (const mark of node.marks ?? []) {
      if (mark.type !== 'link') continue
      const href = mark.attrs?.href
      if (typeof href !== 'string') continue
      const match = INTERNAL_DOCUMENT_LINK_PATTERN.exec(href)
      const targetId = match?.[1]?.toLowerCase()
      if (targetId && !seen.has(targetId)) {
        seen.add(targetId)
        targetIds.push(targetId)
      }
    }
    for (const child of node.content ?? []) visit(child)
  }
  for (const node of content.content) visit(node)
  return targetIds
}

export const extractReferencedImageIds = (content: DocumentContent): readonly string[] => {
  const imageIds: string[] = []
  const seen = new Set<string>()
  const visit = (node: DocumentContentNode): void => {
    if (node.type === 'image') {
      const imageId = node.attrs?.imageId
      if (typeof imageId === 'string') {
        const normalized = imageId.toLowerCase()
        if (!seen.has(normalized)) {
          seen.add(normalized)
          imageIds.push(normalized)
        }
      }
    }
    for (const child of node.content ?? []) visit(child)
  }
  for (const node of content.content) visit(node)
  return imageIds
}

export const parseDocumentContent = (value: unknown): DocumentContent | null => {
  const parsed = documentContentSchema.safeParse(value)
  if (!parsed.success) {
    return null
  }
  return parsed.data
}
