import { describe, expect, expectTypeOf, it } from 'vitest'
import { GLOBAL_NAVIGATION } from '../../../shared/navigation/constants'
import type {
  GlobalNavigationItem,
  NavigationDefinition,
} from '../../../shared/navigation/types'

describe('global navigation contracts', () => {
  it('defines the exact global navigation destinations', () => {
    expect(GLOBAL_NAVIGATION).toEqual({
      DASHBOARD: {
        id: 'dashboard',
        labelKey: 'navigation.dashboard',
        to: '/dashboard',
        icon: 'layout-dashboard',
      },
      PROJECTS: {
        id: 'projects',
        labelKey: 'navigation.projects',
        to: '/projects',
        icon: 'folder-kanban',
      },
      SETTINGS: {
        id: 'settings',
        labelKey: 'navigation.settings',
        to: '/settings',
        icon: 'settings',
      },
      ADMINISTRATION: {
        id: 'administration',
        labelKey: 'navigation.administration',
        to: '/administration',
        icon: 'shield-check',
      },
    })
  })

  it('keeps navigation item fields closed over the global definitions', () => {
    expectTypeOf(GLOBAL_NAVIGATION.DASHBOARD).toMatchTypeOf<NavigationDefinition>()
    expectTypeOf<GlobalNavigationItem['id']>().toEqualTypeOf<
      'dashboard' | 'projects' | 'settings' | 'administration'
    >()
    expectTypeOf<GlobalNavigationItem['labelKey']>().toEqualTypeOf<
      | 'navigation.dashboard'
      | 'navigation.projects'
      | 'navigation.settings'
      | 'navigation.administration'
    >()
    expectTypeOf<GlobalNavigationItem['to']>().toEqualTypeOf<
      '/dashboard' | '/projects' | '/settings' | '/administration'
    >()
    expectTypeOf<GlobalNavigationItem['icon']>().toEqualTypeOf<
      'layout-dashboard' | 'folder-kanban' | 'settings' | 'shield-check'
    >()
  })
})
