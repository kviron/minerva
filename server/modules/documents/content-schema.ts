import { z } from 'zod'
import type {
  DocumentContent,
  DocumentContentNode,
  DocumentJsonValue,
} from '../../../shared/documents/contracts'

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
])
const ALLOWED_MARK_TYPES: ReadonlySet<string> = new Set(['bold', 'italic', 'strike', 'underline', 'code', 'link'])
const SAFE_LINK_PATTERN = /^(?:https?:\/\/|mailto:|\/(?!\/))/u

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

export const documentContentSchema: z.ZodType<DocumentContent> = z.object({
  type: z.literal('doc'),
  content: z.array(nodeSchema),
}).strict()

const validNodeTree = (nodes: readonly DocumentContentNode[]): boolean => {
  let nodeCount = 0
  const pending = [...nodes]
  while (pending.length > 0) {
    const node = pending.pop()
    if (!node) {
      continue
    }
    nodeCount += 1
    if (nodeCount > MAX_DOCUMENT_NODES || !ALLOWED_NODE_TYPES.has(node.type)) {
      return false
    }
    if (node.type === 'text' && typeof node.text !== 'string') {
      return false
    }
    for (const mark of node.marks ?? []) {
      if (!ALLOWED_MARK_TYPES.has(mark.type)) {
        return false
      }
      if (mark.type === 'link') {
        const href = mark.attrs?.href
        if (typeof href !== 'string' || href.length > 2048 || !SAFE_LINK_PATTERN.test(href)) {
          return false
        }
      }
    }
    pending.push(...(node.content ?? []))
  }
  return true
}

export const parseDocumentContent = (value: unknown): DocumentContent | null => {
  const parsed = documentContentSchema.safeParse(value)
  if (!parsed.success) {
    return null
  }
  if (JSON.stringify(parsed.data).length > MAX_DOCUMENT_JSON_LENGTH || !validNodeTree(parsed.data.content)) {
    return null
  }
  return parsed.data
}
