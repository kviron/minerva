// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const adapters = vi.hoisted(() => ({
  signOutIdentity: vi.fn(),
  useIdentitySession: vi.fn(),
}))

vi.mock('@/features/identity/api/auth-client', () => adapters)

import CurrentUserMenu from '@/features/identity/ui/CurrentUserMenu.vue'

const NavUser = {
  name: 'NavUser',
  props: ['user', 'logoutPending', 'logoutError'],
  emits: ['profile', 'logout'],
  template: '<div data-nav-user><button data-profile @click="$emit(\'profile\')" /><button data-logout @click="$emit(\'logout\')" /></div>',
}
const SidebarMenuSkeleton = {
  name: 'SidebarMenuSkeleton',
  props: { showIcon: Boolean },
  template: '<div data-skeleton />',
}
const SidebarMenu = {
  name: 'SidebarMenu',
  template: '<ul data-sidebar-menu><slot /></ul>',
}
const SidebarMenuItem = {
  name: 'SidebarMenuItem',
  template: '<li data-sidebar-menu-item><slot /></li>',
}
const Button = {
  name: 'Button',
  template: '<button><slot /></button>',
}

function sessionState(input: {
  data?: Record<string, unknown> | null
  isPending?: boolean
  error?: unknown
  refetch?: ReturnType<typeof vi.fn>
} = {}) {
  return {
    data: computed(() => input.data ?? null),
    isPending: ref(input.isPending ?? false),
    error: ref(input.error ?? null),
    refetch: input.refetch ?? vi.fn(),
  }
}

const mountMenu = () => mount(CurrentUserMenu, {
  global: { stubs: { NavUser, SidebarMenu, SidebarMenuItem, SidebarMenuSkeleton, Button } },
})

describe('CurrentUserMenu', () => {
  const navigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigateTo', navigate)
    adapters.signOutIdentity.mockResolvedValue({ error: null })
    adapters.useIdentitySession.mockReturnValue(sessionState())
  })

  it('renders a sidebar-compatible skeleton while the session is pending', () => {
    adapters.useIdentitySession.mockReturnValue(sessionState({ isPending: true }))
    const wrapper = mountMenu()

    expect(wrapper.getComponent(SidebarMenuSkeleton).props('showIcon')).toBe(true)
    expect(wrapper.get('[data-sidebar-menu] [data-sidebar-menu-item] [data-skeleton]').exists()).toBe(true)
    expect(wrapper.find('[data-nav-user]').exists()).toBe(false)
  })

  it('renders a localized compact session error and retries', async () => {
    const refetch = vi.fn()
    adapters.useIdentitySession.mockReturnValue(sessionState({ error: new Error('private'), refetch }))
    const wrapper = mountMenu()

    expect(wrapper.get('[data-sidebar-menu] [data-sidebar-menu-item] [role="alert"]').exists()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toBe('Не удалось загрузить пользователя.')
    expect(wrapper.get('[role="alert"]').text()).not.toContain('Повторить')
    await wrapper.get('button').trigger('click')
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('renders no identity and does not redirect for a null session', () => {
    const wrapper = mountMenu()

    expect(wrapper.html()).toBe('<!--v-if-->')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('normalizes the authenticated user passed to NavUser', () => {
    adapters.useIdentitySession.mockReturnValue(sessionState({ data: {
      user: { id: '1', name: ' Анна Смирнова ', email: ' anna@example.ru ', image: '/anna.png' },
    } }))
    const wrapper = mountMenu()

    expect(wrapper.getComponent(NavUser).props('user')).toEqual({
      name: 'Анна Смирнова', email: 'anna@example.ru', initials: 'АС', avatar: '/anna.png',
    })
  })

  it('navigates to the profile from the user menu', async () => {
    adapters.useIdentitySession.mockReturnValue(sessionState({ data: {
      user: { id: '1', name: 'Анна', email: 'anna@example.ru' },
    } }))
    const wrapper = mountMenu()

    await wrapper.get('[data-profile]').trigger('click')
    expect(navigate).toHaveBeenCalledWith('/settings/profile')
  })

  it('guards duplicate logout while pending', async () => {
    let resolve!: (value: { error: null }) => void
    adapters.signOutIdentity.mockReturnValue(new Promise(result => { resolve = result }))
    adapters.useIdentitySession.mockReturnValue(sessionState({ data: {
      user: { id: '1', name: 'Анна', email: 'anna@example.ru' },
    } }))
    const wrapper = mountMenu()

    await wrapper.get('[data-logout]').trigger('click')
    await wrapper.get('[data-logout]').trigger('click')
    expect(adapters.signOutIdentity).toHaveBeenCalledOnce()
    expect(wrapper.getComponent(NavUser).props('logoutPending')).toBe(true)
    resolve({ error: null })
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/auth'))
  })

  it.each([
    ['resolved adapter error', () => adapters.signOutIdentity.mockResolvedValue({ error: new Error('private') })],
    ['rejected adapter exception', () => adapters.signOutIdentity.mockRejectedValue(new Error('private'))],
  ])('keeps the menu and shows a safe error for a %s', async (_label, arrange) => {
    arrange()
    adapters.useIdentitySession.mockReturnValue(sessionState({ data: {
      user: { id: '1', name: 'Анна', email: 'anna@example.ru' },
    } }))
    const wrapper = mountMenu()

    await wrapper.get('[data-logout]').trigger('click')
    await vi.waitFor(() => expect(wrapper.getComponent(NavUser).props('logoutPending')).toBe(false))
    expect(wrapper.getComponent(NavUser).props('logoutError')).toBe('Не удалось выйти. Повторите попытку.')
    expect(wrapper.find('[data-nav-user]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('private')
    expect(navigate).not.toHaveBeenCalledWith('/auth')
  })

  it('awaits navigation to auth after successful logout', async () => {
    let finishNavigation!: () => void
    navigate.mockReturnValue(new Promise<void>(resolve => { finishNavigation = resolve }))
    adapters.useIdentitySession.mockReturnValue(sessionState({ data: {
      user: { id: '1', name: 'Анна', email: 'anna@example.ru' },
    } }))
    const wrapper = mountMenu()

    await wrapper.get('[data-logout]').trigger('click')
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/auth'))
    expect(wrapper.getComponent(NavUser).props('logoutPending')).toBe(true)
    finishNavigation()
    await vi.waitFor(() => expect(wrapper.getComponent(NavUser).props('logoutPending')).toBe(false))
  })
})
