import { z } from 'zod'

export const oauthGrantSummarySchema = z.object({
  id: z.string().uuid(),
  client: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }).strict().readonly(),
  resource: z.string().url(),
  scopes: z.array(z.string().min(1)).readonly(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict().readonly()

export const oauthGrantSummariesResponseSchema = z.array(oauthGrantSummarySchema).readonly()
export const oauthGrantRouteParamsSchema = z.object({
  grantId: z.string().uuid(),
}).strict().readonly()
export const revokeOAuthGrantRequestSchema = z.object({
  expectedUpdatedAt: z.string().datetime(),
}).strict().readonly()
export const oauthConsentDecisionResponseSchema = z.object({
  redirect: z.boolean(),
  url: z.string().url(),
}).strict().readonly()

export type OAuthGrantSummary = z.infer<typeof oauthGrantSummarySchema>
export type OAuthGrantSummariesResponse = z.infer<typeof oauthGrantSummariesResponseSchema>
export type OAuthGrantRouteParams = z.infer<typeof oauthGrantRouteParamsSchema>
export type RevokeOAuthGrantRequest = z.infer<typeof revokeOAuthGrantRequestSchema>
export type OAuthConsentDecisionResponse = z.infer<typeof oauthConsentDecisionResponseSchema>
