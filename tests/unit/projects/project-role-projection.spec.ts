import { describe, expect, it } from 'vitest'
import { projectRoleProjection } from '../../../server/modules/projects/project-role-projection'

describe('project role projection', () => {
  it('maps valid built-in and custom database roles', () => {
    expect(projectRoleProjection('built_in', 'editor', 'Editor')).toEqual({ builtInKey: 'editor', customName: null })
    expect(projectRoleProjection('custom', null, 'Reviewer')).toEqual({ builtInKey: null, customName: 'Reviewer' })
  })

  it('rejects inconsistent database role shapes', () => {
    expect(() => projectRoleProjection('built_in', null, 'Broken')).toThrow('Invalid built-in project role')
    expect(() => projectRoleProjection('custom', null, '')).toThrow('Invalid custom project role')
  })
})
