import { describe, expect, it } from 'vitest'
import { GLOBAL_NAVIGATION } from '../../../shared/navigation/constants'
import { getGlobalNavigation } from '../../../server/modules/navigation/get-global-navigation'

const baseNavigation = [
  GLOBAL_NAVIGATION.DASHBOARD,
  GLOBAL_NAVIGATION.PROJECTS,
  GLOBAL_NAVIGATION.SETTINGS,
]

describe('getGlobalNavigation', () => {
  it('returns only ordinary navigation for a non-super-administrator', () => {
    const navigation = getGlobalNavigation({ user: { superAdmin: false } })

    expect(navigation).toEqual(baseNavigation)
    expect(navigation.map(item => item.id)).toEqual(['dashboard', 'projects', 'settings'])
  })

  it('returns a fresh ordinary navigation array for every call', () => {
    const firstNavigation = getGlobalNavigation({ user: { superAdmin: false } })

    ;(firstNavigation as unknown as Array<(typeof firstNavigation)[number]>).pop()

    expect(getGlobalNavigation({ user: { superAdmin: false } })).toEqual(baseNavigation)
  })

  it('returns fresh navigation items for every call', () => {
    const expectedNavigation = baseNavigation.map(item => ({ ...item }))
    const firstNavigation = getGlobalNavigation({ user: { superAdmin: false } })

    ;(firstNavigation[0] as { id: string }).id = 'poisoned'

    expect(getGlobalNavigation({ user: { superAdmin: false } })).toEqual(expectedNavigation)
  })

  it('appends administration navigation for a strict true superAdmin flag', () => {
    const navigation = getGlobalNavigation({ user: { superAdmin: true } })

    expect(navigation).toEqual([...baseNavigation, GLOBAL_NAVIGATION.ADMINISTRATION])
    expect(navigation.map(item => item.id)).toEqual([
      'dashboard',
      'projects',
      'settings',
      'administration',
    ])
  })

  it.each([
    { user: {} },
    { user: { superAdmin: undefined } },
  ])('does not expose administration or session credentials for $user', (session) => {
    const navigation = getGlobalNavigation({
      ...session,
      session: { token: 'private-token' },
      user: { ...session.user, password: 'private-password' },
    })

    expect(navigation).toEqual(baseNavigation)
    expect(JSON.stringify(navigation)).not.toContain('private')
  })
})
