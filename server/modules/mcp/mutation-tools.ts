import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { MCP_CAPABILITY, capabilitiesForScopes, type McpCapability } from '../../../shared/mcp/capabilities'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import { getDatabase } from '../../infrastructure/database/client'
import { archiveDocument, restoreDocument, type ArchiveDocumentResult, type RestoreDocumentResult } from '../documents/document-archive'
import { createDocument, type CreateDocumentResult } from '../documents/create-document'
import { documentContentSchema } from '../documents/content-schema'
import { publishDocument, type PublishDocumentResult } from '../documents/document-versions'
import { moveDocument, type MoveDocumentResult } from '../documents/move-document'
import { updateDocumentDraft, type UpdateDocumentDraftResult } from '../documents/update-document-draft'
import type { McpAuditAttribution } from '../projects/audit-attribution'
import type { McpActor } from './bearer-validator'
import {
  createMcpIdempotencyCoordinator,
  hashIdempotencyRequest,
  IDEMPOTENCY_RUN_RESULT,
  type IdempotencyCommand,
  type McpJsonValue,
} from './idempotency-coordinator'
import { createMcpIdempotencyPersistence } from './idempotency-persistence'

type DomainMutationResult =
  | CreateDocumentResult
  | UpdateDocumentDraftResult
  | MoveDocumentResult
  | ArchiveDocumentResult
  | RestoreDocumentResult
  | PublishDocumentResult

type SafeDomainResult =
  | Readonly<{ ok: true, value: McpJsonValue }>
  | Readonly<{ ok: false, code: string }>

export interface McpIdempotencyRunner {
  <SafeResult extends McpJsonValue>(
    command: IdempotencyCommand,
    operation: () => Promise<SafeResult>,
  ): Promise<
    | Readonly<{ type: 'executed' | 'replayed', safeResult: McpJsonValue }>
    | Readonly<{ type: 'conflict' | 'grant_inactive' | 'lease_lost' }>
    | Readonly<{ type: 'busy', retryAfterMs: number }>
  >
}

export interface McpMutationDependencies {
  readonly runIdempotent: McpIdempotencyRunner
  readonly createDocument: typeof createDocument
  readonly updateDocument: typeof updateDocumentDraft
  readonly moveDocument: typeof moveDocument
  readonly archiveDocument: typeof archiveDocument
  readonly restoreDocument: typeof restoreDocument
  readonly publishDocument: typeof publishDocument
}

export const createDefaultMcpMutationDependencies = (): McpMutationDependencies => ({
  runIdempotent: createMcpIdempotencyCoordinator(createMcpIdempotencyPersistence({ db: getDatabase().db })),
  createDocument,
  updateDocument: updateDocumentDraft,
  moveDocument,
  archiveDocument,
  restoreDocument,
  publishDocument,
})

const annotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
const uuid = z.string().uuid()
const idempotencyKey = z.string().min(1).max(128).refine(value => value.trim() === value)
const base = { projectId: uuid, idempotencyKey }
const documentBase = { ...base, documentId: uuid }

const safeDomainResult = (result: DomainMutationResult): SafeDomainResult =>
  result.ok
    ? { ok: true, value: result.value }
    : { ok: false, code: result.code }

const attribution = (actor: McpActor, toolName: string): McpAuditAttribution => ({
  clientId: actor.clientId,
  grantId: actor.grantId,
  scopes: actor.scopes,
  toolName,
  requestId: actor.requestId,
})

const textResult = (value: McpJsonValue, isError = false) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  ...(isError ? { isError: true } : {}),
})

const errorResult = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true,
})

const isDomainFailure = (value: McpJsonValue): boolean =>
  typeof value === 'object'
  && value !== null
  && !Array.isArray(value)
  && 'ok' in value
  && value.ok === false

const runMutation = async (
  actor: McpActor,
  dependencies: McpMutationDependencies,
  toolName: string,
  projectId: string,
  key: string,
  validatedInput: unknown,
  operation: () => Promise<SafeDomainResult>,
) => {
  const result = await dependencies.runIdempotent({
    grantId: actor.grantId,
    toolName,
    projectId,
    idempotencyKey: key,
    requestHash: hashIdempotencyRequest(validatedInput),
  }, operation)
  if (result.type === IDEMPOTENCY_RUN_RESULT.EXECUTED || result.type === IDEMPOTENCY_RUN_RESULT.REPLAYED) {
    return textResult(result.safeResult, isDomainFailure(result.safeResult))
  }
  if (result.type === IDEMPOTENCY_RUN_RESULT.CONFLICT) return errorResult('Idempotency key conflict')
  if (result.type === IDEMPOTENCY_RUN_RESULT.BUSY) return errorResult('Request in progress')
  if (result.type === IDEMPOTENCY_RUN_RESULT.GRANT_INACTIVE) return errorResult('Unauthorized')
  return errorResult('Request lease lost')
}

type ToolResult = ReturnType<typeof textResult> | ReturnType<typeof errorResult>
type SdkRegisterBoundary = (
  name: string,
  config: Readonly<{ description: string, inputSchema: z.ZodTypeAny, annotations: typeof annotations }>,
  callback: (input: unknown) => Promise<ToolResult>,
) => unknown

const registerValidatedTool = <Schema extends z.ZodTypeAny>(
  server: McpServer,
  name: string,
  description: string,
  schema: Schema,
  callback: (input: z.infer<Schema>) => Promise<ToolResult>,
): void => {
  // The SDK compatibility generic exceeds TypeScript's instantiation limit; revalidate at this external boundary.
  const register = server.registerTool.bind(server) as unknown as SdkRegisterBoundary
  register(name, { description, inputSchema: schema, annotations }, async (input) => {
    const parsed = schema.safeParse(input)
    return parsed.success ? callback(parsed.data) : errorResult('Invalid request')
  })
}

const registerWhenAllowed = (
  capabilities: ReadonlySet<McpCapability>,
  capability: McpCapability,
  register: () => void,
): void => {
  if (capabilities.has(capability)) register()
}

export function registerMcpMutationTools(
  server: McpServer,
  actor: McpActor,
  dependencies: McpMutationDependencies,
): void {
  const capabilities = capabilitiesForScopes(actor.scopes)
  const templates = [
    DOCUMENT_TEMPLATE.BLANK,
    DOCUMENT_TEMPLATE.TECHNICAL_SPECIFICATION,
    DOCUMENT_TEMPLATE.SITE_OVERVIEW,
    DOCUMENT_TEMPLATE.SECTION_DESCRIPTION,
    DOCUMENT_TEMPLATE.TECHNICAL_NOTES,
    DOCUMENT_TEMPLATE.OPERATING_INSTRUCTIONS,
  ] as const

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_CREATE, () => {
    const schema = z.object({ ...base, title: z.string().trim().min(1).max(200), parentId: uuid.nullable(), template: z.enum(templates) }).strict()
    const toolName = 'minerva_document_create'
    registerValidatedTool(server, toolName, 'Creates a project document.', schema, input =>
      runMutation(actor, dependencies, toolName, input.projectId, input.idempotencyKey, input, async () => safeDomainResult(
        await dependencies.createDocument({
          actorUserId: actor.userId, projectId: input.projectId, channel: AUDIT_CHANNEL.MCP,
          title: input.title, parentId: input.parentId, template: input.template,
          auditAttribution: { kind: 'mcp', value: attribution(actor, toolName) },
        }),
      )))
  })

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_UPDATE, () => {
    const schema = z.object({ ...documentBase, title: z.string().trim().min(1).max(200), content: documentContentSchema, expectedRevision: z.number().int().nonnegative() }).strict()
    const toolName = 'minerva_document_update'
    registerValidatedTool(server, toolName, 'Updates an explicit document draft revision.', schema, input =>
      runMutation(actor, dependencies, toolName, input.projectId, input.idempotencyKey, input, async () => safeDomainResult(
        await dependencies.updateDocument({
          actorUserId: actor.userId, projectId: input.projectId, documentId: input.documentId,
          channel: AUDIT_CHANNEL.MCP, title: input.title, content: input.content,
          expectedRevision: input.expectedRevision,
          auditAttribution: { kind: 'mcp', value: attribution(actor, toolName) },
        }),
      )))
  })

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_MOVE, () => {
    const schema = z.object({ ...documentBase, targetParentId: uuid.nullable(), targetPosition: z.number().int().nonnegative() }).strict()
    const toolName = 'minerva_document_move'
    registerValidatedTool(server, toolName, 'Moves a document to an exact tree position.', schema, input =>
      runMutation(actor, dependencies, toolName, input.projectId, input.idempotencyKey, input, async () => safeDomainResult(
        await dependencies.moveDocument({
          actorUserId: actor.userId, projectId: input.projectId, documentId: input.documentId,
          channel: AUDIT_CHANNEL.MCP, targetParentId: input.targetParentId, targetPosition: input.targetPosition,
          mcpAttribution: attribution(actor, toolName),
        }),
      )))
  })

  const registerLifecycleTool = (
    capability: McpCapability,
    toolName: 'minerva_document_archive' | 'minerva_document_restore',
    operation: McpMutationDependencies['archiveDocument'] | McpMutationDependencies['restoreDocument'],
  ) => registerWhenAllowed(capabilities, capability, () => {
    const schema = z.object(documentBase).strict()
    registerValidatedTool(server, toolName, `${toolName.endsWith('archive') ? 'Archives' : 'Restores'} a document branch.`, schema, input =>
      runMutation(actor, dependencies, toolName, input.projectId, input.idempotencyKey, input, async () => safeDomainResult(
        await operation({
          actorUserId: actor.userId, projectId: input.projectId, documentId: input.documentId,
          channel: AUDIT_CHANNEL.MCP, mcpAttribution: attribution(actor, toolName),
        }),
      )))
  })
  registerLifecycleTool(MCP_CAPABILITY.DOCUMENT_ARCHIVE, 'minerva_document_archive', dependencies.archiveDocument)
  registerLifecycleTool(MCP_CAPABILITY.DOCUMENT_RESTORE, 'minerva_document_restore', dependencies.restoreDocument)

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_PUBLISH, () => {
    const schema = z.object({ ...documentBase, expectedRevision: z.number().int().nonnegative(), changeSummary: z.string().trim().max(1000).optional() }).strict()
    const toolName = 'minerva_document_publish'
    registerValidatedTool(server, toolName, 'Publishes an immutable document version.', schema, input =>
      runMutation(actor, dependencies, toolName, input.projectId, input.idempotencyKey, input, async () => safeDomainResult(
        await dependencies.publishDocument({
          actorUserId: actor.userId, projectId: input.projectId, documentId: input.documentId,
          channel: AUDIT_CHANNEL.MCP, expectedRevision: input.expectedRevision,
          changeSummary: input.changeSummary, mcpAttribution: attribution(actor, toolName),
        }),
      )))
  })
}
