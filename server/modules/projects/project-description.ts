import { eq } from 'drizzle-orm'
import type { DocumentContent, DocumentContentNode } from '../../../shared/documents/contracts'
import { parseDocumentContent } from '../documents/content-schema'
import { AUDIT_OUTCOME, PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { ProjectDescriptionResponse } from '../../../shared/projects/contracts'
import type { AuditChannel } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { auditEvents, projects } from '../../infrastructure/database/schema/projects'
import { hasProjectPermission, type ProjectDatabase } from './project-access'

export const PROJECT_DESCRIPTION_ERROR = {
  INVALID_DESCRIPTION: 'INVALID_DESCRIPTION',
  NOT_FOUND: 'NOT_FOUND',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const

const ALLOWED_NODE_TYPES: ReadonlySet<string> = new Set([
  'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem',
  'blockquote', 'codeBlock', 'hardBreak', 'horizontalRule',
])

const extractText = (nodes: readonly DocumentContentNode[]): string => nodes
  .flatMap(node => [node.text ?? '', ...(node.content ? [extractText(node.content)] : [])])
  .join(' ')
  .replace(/\s+/gu, ' ')
  .trim()

const hasOnlyDescriptionNodes = (nodes: readonly DocumentContentNode[]): boolean => nodes.every(node =>
  ALLOWED_NODE_TYPES.has(node.type) && hasOnlyDescriptionNodes(node.content ?? []))

export type ProjectDescriptionValidationResult =
  | { readonly ok: true, readonly value: { readonly content: DocumentContent, readonly plainText: string | null } }
  | { readonly ok: false, readonly code: typeof PROJECT_DESCRIPTION_ERROR.INVALID_DESCRIPTION }

export const parseProjectDescription = (value: unknown): ProjectDescriptionValidationResult => {
  const content = parseDocumentContent(value)
  if (!content || !hasOnlyDescriptionNodes(content.content)) {
    return { ok: false, code: PROJECT_DESCRIPTION_ERROR.INVALID_DESCRIPTION }
  }
  const text = extractText(content.content)
  if (text.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, code: PROJECT_DESCRIPTION_ERROR.INVALID_DESCRIPTION }
  }
  return { ok: true, value: { content, plainText: text || null } }
}

export const projectDescriptionContentFromText = (text: string | null): DocumentContent => text
  ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
  : { type: 'doc', content: [] }

interface UpdateProjectDescriptionInput {
  readonly actorUserId: string
  readonly projectId: string
  readonly channel: AuditChannel
  readonly content: unknown
}

type UpdateProjectDescriptionResult =
  | { readonly ok: true, readonly value: ProjectDescriptionResponse }
  | { readonly ok: false, readonly code: typeof PROJECT_DESCRIPTION_ERROR[keyof typeof PROJECT_DESCRIPTION_ERROR] }

export const updateProjectDescriptionWith = (db: ProjectDatabase) => async (
  input: UpdateProjectDescriptionInput,
): Promise<UpdateProjectDescriptionResult> => {
  const parsed = parseProjectDescription(input.content)
  if (!parsed.ok) return parsed
  if (!await hasProjectPermission(db, input.projectId, input.actorUserId, PROJECT_PERMISSION.PROJECT_UPDATE)) {
    return { ok: false, code: PROJECT_DESCRIPTION_ERROR.NOT_FOUND }
  }
  try {
    const updatedAt = new Date()
    await db.transaction(async (tx) => {
      await tx.update(projects).set({
        description: parsed.value.plainText,
        descriptionContent: parsed.value.content,
        updatedAt,
      }).where(eq(projects.id, input.projectId))
      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId,
        channel: input.channel,
        action: 'project.description_updated',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: input.projectId,
        targetType: 'project',
        targetId: input.projectId,
        metadata: { characterCount: parsed.value.plainText?.length ?? 0 },
      })
    })
    return { ok: true, value: {
      description: parsed.value.plainText,
      descriptionContent: parsed.value.content,
      updatedAt: updatedAt.toISOString(),
    } }
  }
  catch {
    return { ok: false, code: PROJECT_DESCRIPTION_ERROR.OPERATION_FAILED }
  }
}

export const updateProjectDescription = (input: UpdateProjectDescriptionInput) =>
  updateProjectDescriptionWith(getDatabase().db)(input)
