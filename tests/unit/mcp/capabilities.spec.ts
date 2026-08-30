import { describe, expect, it } from 'vitest'
import { MCP_CAPABILITY, MCP_SCOPE_CAPABILITIES } from '../../../shared/mcp/capabilities'
import { MCP_SCOPE } from '../../../shared/mcp/constants'

describe('MCP delegated capabilities', () => {
  it('keeps project scope limited to project reads', () => {
    expect(MCP_SCOPE_CAPABILITIES[MCP_SCOPE.PROJECTS_READ]).toEqual([
      MCP_CAPABILITY.PROJECT_LIST,
      MCP_CAPABILITY.PROJECT_READ,
    ])
  })

  it('keeps document read scope limited to read-only document capabilities', () => {
    expect(MCP_SCOPE_CAPABILITIES[MCP_SCOPE.DOCUMENTS_READ]).toEqual([
      MCP_CAPABILITY.DOCUMENT_TREE,
      MCP_CAPABILITY.DOCUMENT_READ,
      MCP_CAPABILITY.DOCUMENT_VERSIONS_LIST,
      MCP_CAPABILITY.DOCUMENT_VERSION_READ,
      MCP_CAPABILITY.DOCUMENT_BACKLINKS,
      MCP_CAPABILITY.DOCUMENT_SEARCH,
    ])
    expect(MCP_SCOPE_CAPABILITIES[MCP_SCOPE.DOCUMENTS_READ].every(capability => capability.includes('read') || capability.includes('list') || capability.includes('tree') || capability.includes('backlinks') || capability.includes('search'))).toBe(true)
  })

  it('does not imply publish from document write', () => {
    expect(MCP_SCOPE_CAPABILITIES[MCP_SCOPE.DOCUMENTS_WRITE]).not.toContain(MCP_CAPABILITY.DOCUMENT_PUBLISH)
    expect(MCP_SCOPE_CAPABILITIES[MCP_SCOPE.DOCUMENTS_PUBLISH]).toEqual([MCP_CAPABILITY.DOCUMENT_PUBLISH])
  })
})
