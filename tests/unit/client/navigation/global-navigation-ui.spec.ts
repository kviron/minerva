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
    expect(publicApi.trim()).toBe("export { default as GlobalNavigation } from './ui/GlobalNavigation.vue'")
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

  it('replaces sample navigation while preserving the sidebar header and user footer', async () => {
    const sidebar = await read('../../../../app/components/app/sidebar/index.vue')

    expect(sidebar).toContain('<GlobalNavigation />')
    expect(sidebar).toContain('<SidebarHeader>')
    expect(sidebar).toContain('<NavUser :user="data.user" />')
    expect(sidebar).not.toContain('navMain')
    expect(sidebar).not.toContain('navClouds')
    expect(sidebar).not.toContain('navSecondary')
    expect(sidebar).not.toContain('documents')
  })
})
