// @vitest-environment happy-dom

import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '../../../../app/components/ui/sidebar'
import GlobalNavigation from '../../../../app/features/navigation/ui/GlobalNavigation.vue'
import { GLOBAL_NAVIGATION } from '../../../../shared/navigation/constants'

const { load } = vi.hoisted(() => ({ load: vi.fn() }))

vi.mock('../../../../app/features/navigation/api/global-navigation-api', () => ({
  globalNavigationApi: { load },
}))

vi.stubGlobal('useRoute', () => ({ path: '/projects/42' }))

const Harness = defineComponent({
  components: { GlobalNavigation, SidebarProvider },
  template: '<SidebarProvider><GlobalNavigation /></SidebarProvider>',
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('GlobalNavigation', () => {
  it('renders semantic loading, a safe failure, and retry success', async () => {
    const firstRequest = deferred<readonly (typeof GLOBAL_NAVIGATION)[keyof typeof GLOBAL_NAVIGATION][]>()
    load
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce([
        GLOBAL_NAVIGATION.DASHBOARD,
        GLOBAL_NAVIGATION.PROJECTS,
        GLOBAL_NAVIGATION.SETTINGS,
      ])

    const wrapper = mount(Harness, {
      global: {
        stubs: {
          NuxtLink: RouterLinkStub,
          UiButton: {
            template: '<button><slot /></button>',
          },
        },
      },
    })
    await nextTick()

    const menu = wrapper.get('[data-sidebar="menu"]')
    expect(menu.element.tagName).toBe('UL')
    expect([...menu.element.children].every(child => child.tagName === 'LI')).toBe(true)
    expect(wrapper.findAll('[data-sidebar="menu-skeleton"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-sidebar="menu-skeleton-icon"]')).toHaveLength(3)

    firstRequest.reject(new Error('private server details'))
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Не удалось загрузить меню')
    expect(wrapper.text()).not.toContain('private server details')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(load).toHaveBeenCalledTimes(2)
    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links.map(link => link.props('to'))).toEqual([
      '/dashboard',
      '/projects',
    ])
    expect(links.map(link => link.text())).toEqual(['Главная', 'Проекты'])
    expect(links[1]?.attributes('data-active')).toBe('true')
    expect(wrapper.findAll('svg[aria-hidden="true"]')).toHaveLength(2)
  })
})
