import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { projectLifecycleTransitionHttpStatus } from '../../../server/utils/project-lifecycle-transition-http'

describe('project lifecycle transition HTTP boundary', () => {
  it.each([
    ['NOT_FOUND', 404],
    ['stale_revision', 409],
    ['transition_not_allowed', 409],
    ['transition_id_conflict', 409],
    ['OPERATION_FAILED', 503],
  ] as const)('maps %s to %s', (code, status) => {
    expect(projectLifecycleTransitionHttpStatus(code)).toBe(status)
  })

  it('is private, validates strict shared contracts, and calls the shared application service', async () => {
    const source = await readFile(
      new URL('../../../server/api/projects/[id]/lifecycle-transitions.post.ts', import.meta.url),
      'utf8',
    )
    expect(source).toContain("'Cache-Control', 'private, no-store'")
    expect(source).toContain('projectRouteParamsSchema')
    expect(source).toContain('projectLifecycleTransitionRequestSchema')
    expect(source).toContain('transitionProjectLifecycle')
  })
})
