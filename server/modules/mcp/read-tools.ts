import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { MCP_CAPABILITY, capabilitiesForScopes, type McpCapability } from '../../../shared/mcp/capabilities'
import type {
  DocumentDetailResponse,
  DocumentSearchResponse,
  DocumentTreeResponse,
  DocumentVersionDetail,
  DocumentVersionSummary,
} from '../../../shared/documents/contracts'
import { projectListQuerySchema, type MemberProjectsResponse, type ProjectOverviewProjection } from '../../../shared/projects/contracts'
import { getDatabase } from '../../infrastructure/database/client'
import { getCurrentUserDocument, listCurrentUserDocumentTree } from '../documents/read-documents'
import { searchCurrentUserDocuments } from '../documents/search-documents'
import { getDocumentVersionForUser, listDocumentVersionsForUser } from '../documents/document-versions'
import { getCurrentUserProjectOverview } from '../projects/get-project-overview'
import { listCurrentUserProjects } from '../projects/list-projects'
import { decodeProjectListCursor, type ProjectListCursor } from '../projects/project-list-cursor'
import type { McpActor } from './bearer-validator'

export interface McpReadServices {
  readonly listProjects: (userId: string, options: Readonly<{ limit: number, cursor: ProjectListCursor | null }>) => Promise<MemberProjectsResponse>
  readonly readProject: (projectId: string, userId: string) => Promise<ProjectOverviewProjection | null>
  readonly listDocumentTree: (projectId: string, userId: string) => Promise<DocumentTreeResponse | null>
  readonly readDocument: (projectId: string, documentId: string, userId: string) => Promise<DocumentDetailResponse | null>
  readonly listDocumentVersions: (projectId: string, documentId: string, userId: string) => Promise<readonly DocumentVersionSummary[] | null>
  readonly readDocumentVersion: (projectId: string, documentId: string, versionNumber: number, userId: string) => Promise<DocumentVersionDetail | null>
  readonly searchDocuments: (projectId: string, userId: string, query: string) => Promise<DocumentSearchResponse | null>
}

export const createDefaultMcpReadServices = (): McpReadServices => ({
  listProjects: listCurrentUserProjects,
  readProject: getCurrentUserProjectOverview,
  listDocumentTree: listCurrentUserDocumentTree,
  readDocument: getCurrentUserDocument,
  listDocumentVersions: (projectId, documentId, userId) =>
    listDocumentVersionsForUser(getDatabase().db, projectId, documentId, userId),
  readDocumentVersion: (projectId, documentId, versionNumber, userId) =>
    getDocumentVersionForUser(getDatabase().db, projectId, documentId, versionNumber, userId),
  searchDocuments: searchCurrentUserDocuments,
})

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
}

const projectInput = z.object({ projectId: z.string().uuid() }).strict()
const documentInput = z.object({ projectId: z.string().uuid(), documentId: z.string().uuid() }).strict()
const versionInput = z.object({
  projectId: z.string().uuid(),
  documentId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
}).strict()

const textResult = (value: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
})

const notFoundResult = () => ({
  content: [{ type: 'text' as const, text: 'Not found' }],
  isError: true,
})

const operationFailedResult = () => ({
  content: [{ type: 'text' as const, text: 'Operation failed' }],
  isError: true,
})

type ReadToolResult = ReturnType<typeof textResult> | ReturnType<typeof notFoundResult> | ReturnType<typeof operationFailedResult>
type SdkRegisterBoundary = (
  name: string,
  config: Readonly<{ title?: string, description: string, inputSchema: z.ZodTypeAny, annotations: typeof readOnlyAnnotations }>,
  callback: (input: unknown) => Promise<ReadToolResult>,
) => unknown

const registerValidatedTool = <Schema extends z.ZodTypeAny>(
  server: McpServer,
  name: string,
  description: string,
  schema: Schema,
  callback: (input: z.infer<Schema>) => Promise<ReadToolResult>,
  title?: string,
): void => {
  // The SDK's Zod v3/v4 compatibility generic exceeds TypeScript's instantiation limit here.
  // Keep the assertion at this external boundary and validate unknown input again before domain dispatch.
  const register = server.registerTool.bind(server) as unknown as SdkRegisterBoundary
  register(name, { ...(title ? { title } : {}), description, inputSchema: schema, annotations: readOnlyAnnotations }, async (input) => {
    const parsed = schema.safeParse(input)
    return parsed.success ? callback(parsed.data) : operationFailedResult()
  })
}

const executeRead = async (read: () => Promise<unknown | null>) => {
  try {
    const value = await read()
    return value === null ? notFoundResult() : textResult(value)
  }
  catch {
    return operationFailedResult()
  }
}

const registerWhenAllowed = (
  capabilities: ReadonlySet<McpCapability>,
  capability: McpCapability,
  register: () => void,
): void => {
  if (capabilities.has(capability)) register()
}

export function registerMcpReadTools(server: McpServer, actor: McpActor, services: McpReadServices): void {
  const capabilities = capabilitiesForScopes(actor.scopes)

  registerWhenAllowed(capabilities, MCP_CAPABILITY.PROJECT_LIST, () => {
    registerValidatedTool(server, 'minerva_projects_list',
      actor.locale === 'ru' ? 'Возвращает доступные пользователю проекты.' : 'Lists projects available to the user.',
      projectListQuerySchema,
      ({ cursor, limit }) => executeRead(() => services.listProjects(actor.userId, {
        limit,
        cursor: decodeProjectListCursor(cursor),
      })),
      actor.locale === 'ru' ? 'Список проектов' : 'List projects')
  })

  registerWhenAllowed(capabilities, MCP_CAPABILITY.PROJECT_READ, () => {
    registerValidatedTool(server, 'minerva_project_read',
      actor.locale === 'ru' ? 'Возвращает доступный проект.' : 'Returns an accessible project.',
      projectInput,
      ({ projectId }) => executeRead(() => services.readProject(projectId, actor.userId)))
  })

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_TREE, () => {
    registerValidatedTool(server, 'minerva_document_tree',
      actor.locale === 'ru' ? 'Возвращает активное дерево документации проекта.' : 'Returns the active project document tree.',
      projectInput,
      ({ projectId }) => executeRead(() => services.listDocumentTree(projectId, actor.userId)))
  })

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_READ, () => {
    registerValidatedTool(server, 'minerva_document_read',
      actor.locale === 'ru' ? 'Возвращает активный документ проекта.' : 'Returns an active project document.',
      documentInput,
      ({ projectId, documentId }) => executeRead(() => services.readDocument(projectId, documentId, actor.userId)))
  })

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_VERSIONS_LIST, () => {
    registerValidatedTool(server, 'minerva_document_versions_list',
      actor.locale === 'ru' ? 'Возвращает доступную историю версий документа.' : 'Returns accessible document version history.',
      documentInput,
      ({ projectId, documentId }) => executeRead(() => services.listDocumentVersions(projectId, documentId, actor.userId)))
  })

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_VERSION_READ, () => {
    registerValidatedTool(server, 'minerva_document_version_read',
      actor.locale === 'ru' ? 'Возвращает доступную неизменяемую версию документа.' : 'Returns an accessible immutable document version.',
      versionInput,
      ({ projectId, documentId, versionNumber }) => executeRead(() =>
      services.readDocumentVersion(projectId, documentId, versionNumber, actor.userId)))
  })

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_BACKLINKS, () => {
    registerValidatedTool(server, 'minerva_document_backlinks',
      actor.locale === 'ru' ? 'Возвращает страницы, которые ссылаются на документ.' : 'Returns pages linking to a document.',
      documentInput,
      ({ projectId, documentId }) => executeRead(async () => {
      const document = await services.readDocument(projectId, documentId, actor.userId)
      return document === null ? null : document.backlinks
    }))
  })

  registerWhenAllowed(capabilities, MCP_CAPABILITY.DOCUMENT_SEARCH, () => {
    const searchInput = z.object({
        projectId: z.string().uuid(),
        query: z.string().trim().min(1).max(200),
      }).strict()
    registerValidatedTool(server, 'minerva_documents_search',
      actor.locale === 'ru' ? 'Ищет только доступное содержимое документации.' : 'Searches only accessible document content.',
      searchInput,
      ({ projectId, query }) => executeRead(() => services.searchDocuments(projectId, actor.userId, query)))
  })
}
