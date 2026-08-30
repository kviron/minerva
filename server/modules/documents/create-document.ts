import { and, eq, inArray, isNull, max } from 'drizzle-orm'
import type { DocumentTemplate } from '../../../shared/documents/constants'
import type { DocumentContent } from '../../../shared/documents/contracts'
import { AUDIT_OUTCOME, MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { AuditChannel } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { documents } from '../../infrastructure/database/schema/documents'
import { documentImages } from '../../infrastructure/database/schema/files'
import {
  auditEvents,
  projectMemberships,
  projectRolePermissions,
  projects,
} from '../../infrastructure/database/schema/projects'
import {
  withDocumentMutationAuditAttribution,
  type DocumentMutationAuditAttribution,
} from '../projects/audit-attribution'
import {
  extractInternalDocumentLinkTargetIds,
  extractReferencedImageIds,
  parseDocumentContent,
} from './content-schema'
import { extractDocumentSearchText } from './search-documents'
import { documentTemplateContent } from './templates'

export const CREATE_DOCUMENT_ERROR = {
  INVALID_TITLE: 'INVALID_TITLE',
  INVALID_CONTENT: 'INVALID_CONTENT',
  NOT_FOUND: 'NOT_FOUND',
  CREATE_FAILED: 'CREATE_FAILED',
} as const

export type CreateDocumentErrorCode = typeof CREATE_DOCUMENT_ERROR[keyof typeof CREATE_DOCUMENT_ERROR]

interface CommonCreateDocumentInput {
  readonly actorUserId: string
  readonly projectId: string
  readonly channel: AuditChannel
  readonly title: string
  readonly parentId: string | null
  readonly auditAttribution?: DocumentMutationAuditAttribution
}

export type CreateDocumentInput = CommonCreateDocumentInput & (
  | Readonly<{ template: DocumentTemplate, content?: never }>
  | Readonly<{ content: unknown, template?: never }>
)

export interface ValidCreateDocumentCommand extends CommonCreateDocumentInput {
  readonly title: string
  readonly initialSource:
    | Readonly<{ kind: 'template', template: DocumentTemplate }>
    | Readonly<{ kind: 'content', content: DocumentContent }>
  readonly searchText: string
  readonly internalLinkTargetIds: readonly string[]
  readonly referencedImageIds: readonly string[]
}

export type CreateDocumentValidationResult =
  | { readonly ok: true, readonly value: ValidCreateDocumentCommand }
  | { readonly ok: false, readonly code:
    | typeof CREATE_DOCUMENT_ERROR.INVALID_TITLE
    | typeof CREATE_DOCUMENT_ERROR.INVALID_CONTENT
  }

type CreateDocumentPersistenceResult =
  | { readonly ok: true, readonly documentId: string }
  | { readonly ok: false, readonly code: typeof CREATE_DOCUMENT_ERROR.NOT_FOUND }

export type CreateDocumentResult =
  | { readonly ok: true, readonly value: { readonly documentId: string } }
  | { readonly ok: false, readonly code: CreateDocumentErrorCode }

export interface CreateDocumentDependencies {
  readonly persist: (command: ValidCreateDocumentCommand) => Promise<CreateDocumentPersistenceResult>
}

type DocumentsDatabase = ReturnType<typeof getDatabase>['db']
export type DocumentMutationTransaction = Pick<DocumentsDatabase, 'select' | 'insert' | 'update'>

const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export const slugBaseFromTitle = (title: string): string => {
  const transliterated = [...title.trim().toLowerCase().normalize('NFKD')]
    .map(character => CYRILLIC_TO_LATIN[character] ?? character)
    .join('')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 160)

  return transliterated || 'stranitsa'
}

export const nextAvailableSlug = (base: string, existingSlugs: readonly string[]): string => {
  const existing = new Set(existingSlugs)
  if (!existing.has(base)) {
    return base
  }

  let sequence = 2
  while (existing.has(`${base.slice(0, 160 - `-${sequence}`.length)}-${sequence}`)) {
    sequence += 1
  }
  const suffix = `-${sequence}`
  return `${base.slice(0, 160 - suffix.length)}${suffix}`
}

export const validateCreateDocument = (input: CreateDocumentInput): CreateDocumentValidationResult => {
  const title = input.title.trim()
  if (title.length === 0 || title.length > 200) {
    return { ok: false, code: CREATE_DOCUMENT_ERROR.INVALID_TITLE }
  }
  const content = 'content' in input
    ? parseDocumentContent(input.content)
    : documentTemplateContent(input.template)
  if (content === null) {
    return { ok: false, code: CREATE_DOCUMENT_ERROR.INVALID_CONTENT }
  }
  const { template: _template, content: _content, ...common } = input
  return {
    ok: true,
    value: {
      ...common,
      title,
      initialSource: 'content' in input
        ? { kind: 'content', content }
        : { kind: 'template', template: input.template },
      searchText: extractDocumentSearchText(content),
      internalLinkTargetIds: extractInternalDocumentLinkTargetIds(content),
      referencedImageIds: extractReferencedImageIds(content),
    },
  }
}

export const createDocumentInTransaction = async (
  tx: DocumentMutationTransaction,
  command: ValidCreateDocumentCommand,
): Promise<CreateDocumentPersistenceResult> => {
    const [project] = await tx.select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, command.projectId), isNull(projects.archivedAt)))
      .for('update')

    if (!project) {
      return { ok: false, code: CREATE_DOCUMENT_ERROR.NOT_FOUND }
    }

    const [access] = await tx.select({ membershipId: projectMemberships.id })
      .from(projectMemberships)
      .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
      .where(and(
        eq(projectMemberships.projectId, command.projectId),
        eq(projectMemberships.userId, command.actorUserId),
        eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
        eq(projectRolePermissions.permissionCode, PROJECT_PERMISSION.DOCUMENTS_CREATE),
      ))
      .limit(1)

    if (!access) {
      return { ok: false, code: CREATE_DOCUMENT_ERROR.NOT_FOUND }
    }

    if (command.parentId !== null) {
      const [parent] = await tx.select({ id: documents.id })
        .from(documents)
        .where(and(
          eq(documents.id, command.parentId),
          eq(documents.projectId, command.projectId),
          isNull(documents.archivedAt),
        ))
        .limit(1)

      if (!parent) {
        return { ok: false, code: CREATE_DOCUMENT_ERROR.NOT_FOUND }
      }
    }

    if (command.referencedImageIds.length > 0) {
      const imageRows = await tx.select({ id: documentImages.id }).from(documentImages).where(and(
        eq(documentImages.projectId, command.projectId),
        isNull(documentImages.archivedAt),
        inArray(documentImages.id, command.referencedImageIds),
      ))
      if (imageRows.length !== command.referencedImageIds.length) {
        return { ok: false, code: CREATE_DOCUMENT_ERROR.NOT_FOUND }
      }
    }

    const siblingParent = command.parentId === null
      ? isNull(documents.parentId)
      : eq(documents.parentId, command.parentId)
    const [lastPosition] = await tx.select({ value: max(documents.position) })
      .from(documents)
      .where(and(
        eq(documents.projectId, command.projectId),
        siblingParent,
        isNull(documents.archivedAt),
      ))
    const existingSlugs = await tx.select({ slug: documents.slug })
      .from(documents)
      .where(eq(documents.projectId, command.projectId))
    const slug = nextAvailableSlug(slugBaseFromTitle(command.title), existingSlugs.map(row => row.slug))

    const draftContent = command.initialSource.kind === 'template'
      ? documentTemplateContent(command.initialSource.template)
      : command.initialSource.content
    const [created] = await tx.insert(documents).values({
      projectId: command.projectId,
      parentId: command.parentId,
      title: command.title,
      slug,
      position: (lastPosition?.value ?? -1) + 1,
      ownerUserId: command.actorUserId,
      draftContent,
      draftSearchText: command.searchText,
      draftInternalLinkTargetIds: [...command.internalLinkTargetIds],
      draftReferencedImageIds: [...command.referencedImageIds],
    }).returning({ id: documents.id })

    if (!created) {
      throw new Error('Document insert returned no row')
    }

    await tx.insert(auditEvents).values({
      actorUserId: command.actorUserId,
      channel: command.channel,
      action: 'document.created',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      projectId: command.projectId,
      targetType: 'document',
      targetId: created.id,
      metadata: withDocumentMutationAuditAttribution(
        command.initialSource.kind === 'template'
          ? { parentId: command.parentId, template: command.initialSource.template }
          : { parentId: command.parentId, source: 'content' },
        command.auditAttribution,
        { documentId: created.id, draftRevision: 0 },
      ),
    })

    return { ok: true, documentId: created.id }
}

export const createDocumentPersistence = (db: DocumentsDatabase): CreateDocumentDependencies['persist'] =>
  command => db.transaction(tx => createDocumentInTransaction(tx, command))

export const createDocumentWith = (dependencies: CreateDocumentDependencies) =>
  async (input: CreateDocumentInput): Promise<CreateDocumentResult> => {
    const validation = validateCreateDocument(input)
    if (!validation.ok) {
      return validation
    }

    try {
      const result = await dependencies.persist(validation.value)
      return result.ok
        ? { ok: true, value: { documentId: result.documentId } }
        : result
    }
    catch {
      return { ok: false, code: CREATE_DOCUMENT_ERROR.CREATE_FAILED }
    }
  }

export const createDocument = (input: CreateDocumentInput) =>
  createDocumentWith({ persist: createDocumentPersistence(getDatabase().db) })(input)
