import { z } from 'zod'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { documentContentSchema } from './content-schema'

export const createDocumentBodySchema = z.object({
  title: z.string(),
  parentId: z.string().uuid().nullable(),
  template: z.enum([
    DOCUMENT_TEMPLATE.BLANK,
    DOCUMENT_TEMPLATE.TECHNICAL_SPECIFICATION,
    DOCUMENT_TEMPLATE.SITE_OVERVIEW,
    DOCUMENT_TEMPLATE.SECTION_DESCRIPTION,
    DOCUMENT_TEMPLATE.TECHNICAL_NOTES,
    DOCUMENT_TEMPLATE.OPERATING_INSTRUCTIONS,
  ]),
}).strict()

export const updateDocumentDraftBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: documentContentSchema,
  expectedRevision: z.number().int().nonnegative(),
}).strict()

export const moveDocumentBodySchema = z.object({
  targetParentId: z.string().uuid().nullable(),
  targetPosition: z.number().int().nonnegative(),
}).strict()

export const publishDocumentBodySchema = z.object({
  changeSummary: z.string().trim().max(1000).optional().default(''),
  expectedRevision: z.number().int().nonnegative(),
}).strict()

export const restoreDocumentVersionBodySchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
}).strict()

export const searchDocumentsBodySchema = z.object({
  query: z.string().trim().min(1).max(200),
}).strict()
