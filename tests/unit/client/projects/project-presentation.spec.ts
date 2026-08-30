import { describe, expect, it } from 'vitest'
import {
  administrationProjectTableRows,
  memberProjectTableRows,
  projectRoleLabel,
  projectStatusLabel,
} from '../../../../app/features/projects/model/presentation'

describe('project presentation', () => {
  it('localizes built-in roles and statuses', () => {
    expect(projectRoleLabel({ builtInKey: 'editor', customName: null })).toBe('Редактор')
    expect(projectStatusLabel('active')).toBe('Активен')
    expect(projectStatusLabel('paused')).toBe('Приостановлен')
    expect(projectStatusLabel('closed')).toBe('Закрыт')
  })

  it('uses a custom role name', () => {
    expect(projectRoleLabel({ builtInKey: null, customName: 'Автор' })).toBe('Автор')
  })

  it('creates one table projection for both list contracts', () => {
    const base = {
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
      name: 'Minerva',
      description: null,
      status: 'active',
      iconId: null,
      updatedAt: '2026-07-16T10:00:00.000Z',
    } as const
    expect(memberProjectTableRows([{ ...base, role: { builtInKey: 'admin', customName: null } }])).toHaveLength(1)
    expect(administrationProjectTableRows([{ ...base, activeMemberCount: 3 }])[0]?.access).toBe(3)
  })
})
