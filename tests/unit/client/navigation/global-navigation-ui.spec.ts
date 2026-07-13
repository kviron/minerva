import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('global navigation UI boundary', () => {
  it('keeps loading and rendering inside the feature public boundary', async () => {
    const [ui, publicApi, sidebar] = await Promise.all([
      read('../../../../app/features/navigation/ui/GlobalNavigation.vue'),
      read('../../../../app/features/navigation/index.ts'),
      read('../../../../app/components/app/sidebar/index.vue'),
    ])

    expect(ui).toContain('SidebarMenuSkeleton')
    expect(ui).toContain('<NuxtLink')
    expect(ui).toContain('navigation.load')
    expect(publicApi).toContain("export { default as GlobalNavigation } from './ui/GlobalNavigation.vue'")
    expect(publicApi).toContain("export { default as GlobalSettingsNavigation } from './ui/GlobalSettingsNavigation.vue'")
    expect(sidebar).toContain("from '@/features/navigation'")
    expect(sidebar).not.toContain('@/features/navigation/')
  })

  it('renders the approved loading, error, and navigation states', async () => {
    const ui = await read('../../../../app/features/navigation/ui/GlobalNavigation.vue')

    expect(ui).toContain('initialLoadPending')
    expect(ui).toContain('show-icon')
    expect(ui).toContain('role="alert"')
    expect(ui).toContain('{{ navigation.error.value }}')
    expect(ui).toContain('Повторить')
    expect(ui).toContain('aria-hidden="true"')
    expect(ui).toContain('isGlobalNavigationItemActive(item, route.path)')
    expect(ui).toContain('translateNavigationLabel(item.labelKey)')
  })

  it('uses only public feature boundaries and removes the temporary user fixture', async () => {
    const [sidebar, identityApi, currentUserMenu] = await Promise.all([
      read('../../../../app/components/app/sidebar/index.vue'),
      read('../../../../app/features/identity/index.ts'),
      read('../../../../app/features/identity/ui/CurrentUserMenu.vue'),
    ])

    expect(sidebar).toContain('<GlobalNavigation v-if="currentProjectId === null" />')
    expect(sidebar).toContain('<GlobalSettingsNavigation class="mt-auto" />')
    expect(sidebar).toContain('<CurrentUserMenu />')
    expect(sidebar).toContain("from '@/features/identity'")
    expect(sidebar).not.toContain('@/features/identity/')
    expect(sidebar).not.toContain('NavUser')
    expect(sidebar).not.toContain('data.user')
    expect(sidebar).not.toMatch(/shadcn|avatar|initials/i)
    expect(identityApi).toContain("export { default as CurrentUserMenu } from './ui/CurrentUserMenu.vue'")
    expect(identityApi).not.toMatch(/useIdentitySession|signOutIdentity/)
    expect(currentUserMenu).toContain("from '../api/auth-client'")
    expect(currentUserMenu).toContain("from '../model/current-user'")
    expect(sidebar).not.toContain('navMain')
    expect(sidebar).not.toContain('navClouds')
    expect(sidebar).not.toContain('navSecondary')
    expect(sidebar).not.toContain('documents')
  })
})
