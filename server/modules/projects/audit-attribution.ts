export interface McpAuditAttribution {
  readonly clientId: string
  readonly grantId: string
  readonly scopes: readonly string[]
  readonly toolName: string
  readonly requestId: string
}

export interface AiAuditAttribution {
  readonly proposalId: string
  readonly conversationId: string
  readonly turnRequestId: string
  readonly operation: 'create' | 'update'
}

export type DocumentMutationAuditAttribution =
  | Readonly<{ kind: 'mcp', value: McpAuditAttribution }>
  | Readonly<{ kind: 'ai', value: AiAuditAttribution }>

export interface DocumentMutationAuditResult {
  readonly documentId: string
  readonly draftRevision: number
}

export const withMcpAuditAttribution = <Metadata extends Readonly<Record<string, unknown>>>(
  metadata: Metadata,
  attribution: McpAuditAttribution | undefined,
): Metadata | (Metadata & Readonly<{ mcp: McpAuditAttribution }>) =>
  attribution === undefined ? metadata : { ...metadata, mcp: attribution }

export const withDocumentMutationAuditAttribution = <
  Metadata extends Readonly<Record<string, unknown>>,
>(
  metadata: Metadata,
  attribution: DocumentMutationAuditAttribution | undefined,
  result: DocumentMutationAuditResult,
): Metadata
  | (Metadata & Readonly<{ mcp: McpAuditAttribution }>)
  | (Metadata & Readonly<{
    ai: AiAuditAttribution & DocumentMutationAuditResult
  }>) => {
  if (attribution === undefined) return metadata
  return attribution.kind === 'mcp'
    ? { ...metadata, mcp: attribution.value }
    : { ...metadata, ai: { ...attribution.value, ...result } }
}
