import { z } from 'zod'
import {
  DOCUMENT_PUBLIC_SHARE_SCOPE,
  DOCUMENT_PUBLIC_SHARE_STATUS,
  DOCUMENT_PUBLIC_SHARE_TOKEN_LENGTH,
  DOCUMENT_PUBLIC_SHARE_URL_MAX_LENGTH,
} from './public-share-constants'
import { documentContentSchema } from './contracts'

export const documentPublicShareTokenSchema = z.string()
  .length(DOCUMENT_PUBLIC_SHARE_TOKEN_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/u)

export const documentPublicShareCreateRequestSchema = z.object({
  scope: z.nativeEnum(DOCUMENT_PUBLIC_SHARE_SCOPE),
}).strict().readonly()

const documentPublicShareRouteParamsBaseSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
}).strict()

export const documentPublicShareRouteParamsSchema = documentPublicShareRouteParamsBaseSchema.readonly()

export const documentPublicShareRecordRouteParamsSchema = documentPublicShareRouteParamsBaseSchema.extend({
  shareId: z.string().uuid(),
}).strict().readonly()

export const documentPublicShareProjectionSchema = z.object({
  id: z.string().uuid(),
  rootDocumentId: z.string().uuid(),
  scope: z.nativeEnum(DOCUMENT_PUBLIC_SHARE_SCOPE),
  status: z.nativeEnum(DOCUMENT_PUBLIC_SHARE_STATUS),
  createdAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
}).strict().readonly()

export const documentPublicShareListResponseSchema = z.object({
  shares: z.array(documentPublicShareProjectionSchema).max(2).readonly(),
}).strict().readonly()

export const documentPublicShareMutationResponseSchema = z.object({
  share: documentPublicShareProjectionSchema,
  url: z.string().url().max(DOCUMENT_PUBLIC_SHARE_URL_MAX_LENGTH),
}).strict().readonly()

export const publicDocumentTreeNodeSchema: z.ZodType<PublicDocumentTreeNode> = z.lazy(() => z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160),
  children: z.array(publicDocumentTreeNodeSchema).readonly(),
}).strict().readonly())

export const publicDocumentInternalLinkSchema = z.object({
  documentId: z.string().uuid(),
  available: z.boolean(),
}).strict().readonly()

export const publicDocumentPageSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160),
  content: documentContentSchema,
  publishedAt: z.string().datetime(),
  internalLinks: z.array(publicDocumentInternalLinkSchema).readonly(),
}).strict().readonly()

export const publicDocumentationResponseSchema = z.object({
  scope: z.nativeEnum(DOCUMENT_PUBLIC_SHARE_SCOPE),
  rootDocumentId: z.string().uuid(),
  projectName: z.string().min(1).max(120),
  page: publicDocumentPageSchema,
  tree: z.array(publicDocumentTreeNodeSchema).max(1).readonly(),
}).strict().readonly()

export const publicDocumentationUnavailableResponseSchema = z.object({
  statusCode: z.literal(404),
  message: z.literal('Documentation unavailable'),
}).strict().readonly()

export type DocumentPublicShareCreateRequest = z.infer<typeof documentPublicShareCreateRequestSchema>
export type DocumentPublicShareProjection = z.infer<typeof documentPublicShareProjectionSchema>
export type DocumentPublicShareListResponse = z.infer<typeof documentPublicShareListResponseSchema>
export type DocumentPublicShareMutationResponse = z.infer<typeof documentPublicShareMutationResponseSchema>
export interface PublicDocumentTreeNode {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly children: readonly PublicDocumentTreeNode[]
}
export type PublicDocumentInternalLink = z.infer<typeof publicDocumentInternalLinkSchema>
export type PublicDocumentPage = z.infer<typeof publicDocumentPageSchema>
export type PublicDocumentationResponse = z.infer<typeof publicDocumentationResponseSchema>
