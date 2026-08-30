export const MCP_SCOPE = {
  OFFLINE_ACCESS: 'offline_access',
  PROJECTS_READ: 'projects:read',
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_WRITE: 'documents:write',
  DOCUMENTS_PUBLISH: 'documents:publish',
} as const

export const MCP_SCOPES = [
  MCP_SCOPE.OFFLINE_ACCESS,
  MCP_SCOPE.PROJECTS_READ,
  MCP_SCOPE.DOCUMENTS_READ,
  MCP_SCOPE.DOCUMENTS_WRITE,
  MCP_SCOPE.DOCUMENTS_PUBLISH,
] as const
