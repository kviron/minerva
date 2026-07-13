import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('projects action architecture', () => {
  it('keeps effects in stateless feature actions and state in Pinia', async () => {
    const [actions, listState, overviewState] = await Promise.all([
      read('../../../../app/features/projects/model/actions/actions.ts'),
      read('../../../../app/features/projects/model/projects-state.ts'),
      read('../../../../app/features/projects/model/project-overview-state.ts'),
    ])

    expect(actions).toContain('extends BaseActions')
    expect(actions).toContain('projectsApi')
    expect(actions).not.toContain('pinia')
    expect(actions).not.toContain('useProjectsStore')
    expect(actions).not.toContain('useProjectOverviewStore')
    expect(listState).toContain("defineStore('projects'")
    expect(overviewState).toContain("defineStore('project-overview'")
    expect(listState).not.toContain('projectsApi')
    expect(overviewState).not.toContain('projectsApi')
  })
})
