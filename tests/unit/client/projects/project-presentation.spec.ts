import { describe, expect, it } from 'vitest'
import { projectRoleLabel, projectStatusLabel } from '../../../../app/features/projects/model/presentation'

describe('project presentation', () => {
  it('localizes built-in roles and statuses', () => {
    expect(projectRoleLabel({ builtInKey: 'editor', customName: null })).toBe('Редактор')
    expect(projectStatusLabel('active')).toBe('Активен')
  })

  it('uses a custom role name', () => {
    expect(projectRoleLabel({ builtInKey: null, customName: 'Автор' })).toBe('Автор')
  })
})
