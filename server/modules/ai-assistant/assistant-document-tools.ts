import { z } from 'zod'
import type {
  DocumentDetailResponse,
  DocumentSearchResponse,
  DocumentTreeResponse,
  DocumentVersionDetail,
} from '../../../shared/documents/contracts'
import { extractDocumentSearchText } from '../documents/search-documents'

export const ASSISTANT_DOCUMENT_TOOL = {
  SEARCH: 'search_documentation',
  READ: 'read_document',
  LIST_TREE: 'list_document_tree',
  READ_VERSION: 'read_document_version',
} as const

export type AssistantDocumentToolName =
  typeof ASSISTANT_DOCUMENT_TOOL[keyof typeof ASSISTANT_DOCUMENT_TOOL]

export const ASSISTANT_TOOL_ERROR = {
  INVALID_CALL: 'INVALID_CALL',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const

export interface AssistantToolDefinition {
  readonly name: AssistantDocumentToolName
  readonly description: string
  readonly strict: true
  readonly readOnly: true
  readonly parameters: Readonly<{
    type: 'object'
    properties: Readonly<Record<string, unknown>>
    required: readonly string[]
    additionalProperties: false
  }>
}

export const assistantDocumentToolDefinitions: readonly AssistantToolDefinition[] = [
  {
    name: ASSISTANT_DOCUMENT_TOOL.SEARCH,
    description: 'Search currently authorized Minerva project documentation by a short query.',
    strict: true,
    readOnly: true,
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', minLength: 1, maxLength: 400 } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: ASSISTANT_DOCUMENT_TOOL.READ,
    description: 'Read one currently authorized active Minerva document by its stable ID.',
    strict: true,
    readOnly: true,
    parameters: {
      type: 'object',
      properties: { documentId: { type: 'string', format: 'uuid' } },
      required: ['documentId'],
      additionalProperties: false,
    },
  },
  {
    name: ASSISTANT_DOCUMENT_TOOL.LIST_TREE,
    description: 'List the currently authorized active Minerva documentation tree.',
    strict: true,
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: ASSISTANT_DOCUMENT_TOOL.READ_VERSION,
    description: 'Read one authorized immutable Minerva document version.',
    strict: true,
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', format: 'uuid' },
        versionNumber: { type: 'integer', minimum: 1 },
      },
      required: ['documentId', 'versionNumber'],
      additionalProperties: false,
    },
  },
]

const searchArgumentsSchema = z.object({
  query: z.string().trim().min(1).max(400),
}).strict()
const readArgumentsSchema = z.object({ documentId: z.string().uuid() }).strict()
const listTreeArgumentsSchema = z.object({}).strict()
const readVersionArgumentsSchema = z.object({
  documentId: z.string().uuid(),
  versionNumber: z.number().int().min(1),
}).strict()

interface AssistantToolContext {
  readonly projectId: string
  readonly actorUserId: string
}

interface AssistantDocumentToolDependencies {
  readonly search: (
    projectId: string,
    actorUserId: string,
    query: string,
  ) => Promise<DocumentSearchResponse | null>
  readonly read: (
    projectId: string,
    documentId: string,
    actorUserId: string,
  ) => Promise<DocumentDetailResponse | null>
  readonly listTree: (
    projectId: string,
    actorUserId: string,
  ) => Promise<DocumentTreeResponse | null>
  readonly readVersion: (
    projectId: string,
    documentId: string,
    versionNumber: number,
    actorUserId: string,
  ) => Promise<DocumentVersionDetail | null>
}

export interface AssistantToolCall {
  readonly name: string
  readonly argumentsJson: string
}

export type AssistantToolExecutionResult =
  | {
    readonly ok: true
    readonly toolName: AssistantDocumentToolName
    readonly documentIds: readonly string[]
    readonly documents: readonly Readonly<{ id: string, title: string }>[]
    readonly output: string
  }
  | {
    readonly ok: false
    readonly code: typeof ASSISTANT_TOOL_ERROR[keyof typeof ASSISTANT_TOOL_ERROR]
  }

const MAX_TOOL_OUTPUT_LENGTH = 8_000
const MAX_SEARCH_RESULTS = 8
const MAX_TREE_ENTRIES = 200

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value)
  }
  catch {
    return null
  }
}

const boundedUntrustedOutput = (value: unknown): string => {
  const serialized = JSON.stringify({ type: 'untrusted_document_data', data: value })
  if (serialized.length <= MAX_TOOL_OUTPUT_LENGTH) return serialized
  return JSON.stringify({
    type: 'untrusted_document_data',
    truncated: true,
    data: serialized.slice(0, 7_400),
  })
}

const flattenTree = (tree: DocumentTreeResponse) => {
  const entries: Array<Readonly<{ id: string, title: string, parentId: string | null }>> = []
  const visit = (nodes: DocumentTreeResponse, parentId: string | null): void => {
    for (const node of nodes) {
      if (entries.length >= MAX_TREE_ENTRIES) return
      entries.push({ id: node.id, title: node.title, parentId })
      visit(node.children, node.id)
    }
  }
  visit(tree, null)
  return entries
}

const success = (
  toolName: AssistantDocumentToolName,
  documents: readonly Readonly<{ id: string, title: string }>[],
  value: unknown,
): AssistantToolExecutionResult => ({
  ok: true,
  toolName,
  documentIds: [...new Set(documents.map(document => document.id))],
  documents: [...new Map(documents.map(document => [document.id, document])).values()],
  output: boundedUntrustedOutput(value),
})

const invalidCall = (): AssistantToolExecutionResult => ({
  ok: false,
  code: ASSISTANT_TOOL_ERROR.INVALID_CALL,
})

const denied = (): AssistantToolExecutionResult => ({
  ok: false,
  code: ASSISTANT_TOOL_ERROR.PERMISSION_DENIED,
})

export const createAssistantDocumentToolExecutor = (
  context: AssistantToolContext,
  dependencies: AssistantDocumentToolDependencies,
) => async (call: AssistantToolCall): Promise<AssistantToolExecutionResult> => {
  const rawArguments = parseJson(call.argumentsJson)
  if (call.name === ASSISTANT_DOCUMENT_TOOL.SEARCH) {
    const argumentsResult = searchArgumentsSchema.safeParse(rawArguments)
    if (!argumentsResult.success) return invalidCall()
    const results = await dependencies.search(
      context.projectId,
      context.actorUserId,
      argumentsResult.data.query,
    )
    if (results === null) return denied()
    const limited = results.slice(0, MAX_SEARCH_RESULTS)
    return success(call.name, limited.map(result => ({ id: result.id, title: result.title })), limited.map(result => ({
      id: result.id,
      title: result.title,
      excerpt: result.excerpt,
      publicationState: result.publicationState,
    })))
  }

  if (call.name === ASSISTANT_DOCUMENT_TOOL.READ) {
    const argumentsResult = readArgumentsSchema.safeParse(rawArguments)
    if (!argumentsResult.success) return invalidCall()
    const document = await dependencies.read(
      context.projectId,
      argumentsResult.data.documentId,
      context.actorUserId,
    )
    if (document === null) return denied()
    return success(call.name, [{ id: document.id, title: document.title }], {
      id: document.id,
      title: document.title,
      text: extractDocumentSearchText(document.draftContent),
      publicationState: document.publicationState,
      ancestors: document.ancestors,
      children: document.children,
      internalLinks: document.internalLinks,
      backlinks: document.backlinks,
    })
  }

  if (call.name === ASSISTANT_DOCUMENT_TOOL.LIST_TREE) {
    const argumentsResult = listTreeArgumentsSchema.safeParse(rawArguments)
    if (!argumentsResult.success) return invalidCall()
    const tree = await dependencies.listTree(context.projectId, context.actorUserId)
    if (tree === null) return denied()
    const entries = flattenTree(tree)
    return success(call.name, [], entries)
  }

  if (call.name === ASSISTANT_DOCUMENT_TOOL.READ_VERSION) {
    const argumentsResult = readVersionArgumentsSchema.safeParse(rawArguments)
    if (!argumentsResult.success) return invalidCall()
    const version = await dependencies.readVersion(
      context.projectId,
      argumentsResult.data.documentId,
      argumentsResult.data.versionNumber,
      context.actorUserId,
    )
    if (version === null) return denied()
    return success(call.name, [{ id: argumentsResult.data.documentId, title: version.title }], {
      documentId: argumentsResult.data.documentId,
      versionNumber: version.versionNumber,
      title: version.title,
      changeSummary: version.changeSummary,
      publishedAt: version.publishedAt,
      text: extractDocumentSearchText(version.content),
    })
  }

  return invalidCall()
}
