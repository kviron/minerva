// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/sidebar', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/components/ui/sidebar')>(),
  useSidebar: () => ({ isMobile: false }),
}))

import NavUser from '@/components/nav/user/index.vue'

const passthrough = (name: string, tag = 'div') => ({
  name,
  inheritAttrs: false,
  template: `<${tag} v-bind="$attrs"><slot /></${tag}>`,
})

const stubs = {
  Avatar: passthrough('Avatar'),
  AvatarFallback: passthrough('AvatarFallback'),
  AvatarImage: { name: 'AvatarImage', props: ['src', 'alt'], template: '<img :src="src" :alt="alt">' },
  DropdownMenu: passthrough('DropdownMenu'),
  DropdownMenuContent: passthrough('DropdownMenuContent'),
  DropdownMenuGroup: passthrough('DropdownMenuGroup'),
  DropdownMenuItem: passthrough('DropdownMenuItem', 'button'),
  DropdownMenuLabel: passthrough('DropdownMenuLabel'),
  DropdownMenuSeparator: passthrough('DropdownMenuSeparator'),
  DropdownMenuTrigger: passthrough('DropdownMenuTrigger'),
  SidebarMenu: passthrough('SidebarMenu'),
  SidebarMenuButton: passthrough('SidebarMenuButton', 'button'),
  SidebarMenuItem: passthrough('SidebarMenuItem'),
  IconDotsVertical: passthrough('IconDotsVertical', 'i'),
  IconUser: passthrough('IconUser', 'i'),
}

function mountMenu(overrides: Record<string, unknown> = {}) {
  return mount(NavUser, {
    props: {
      user: { name: 'Анна Смирнова', email: 'anna@example.ru', initials: 'АС' },
      logoutPending: false,
      ...overrides,
    },
    global: {
      stubs,
    },
  })
}

describe('NavUser', () => {
  it('renders authenticated identity and an accessible trigger', () => {
    const wrapper = mountMenu()

    expect(wrapper.text()).toContain('Анна Смирнова')
    expect(wrapper.text()).toContain('anna@example.ru')
    expect(wrapper.text()).toContain('АС')
    expect(wrapper.find('[aria-label="Меню пользователя Анна Смирнова"]').exists()).toBe(true)
  })

  it('renders an image only when supplied and always keeps a fallback', () => {
    const withAvatar = mountMenu({
      user: { name: 'Анна Смирнова', email: 'anna@example.ru', initials: 'АС', avatar: '/anna.png' },
    })
    expect(withAvatar.findAll('img')).toHaveLength(2)
    expect(withAvatar.find('img').attributes()).toMatchObject({ src: '/anna.png', alt: 'Анна Смирнова' })
    expect(withAvatar.findAllComponents({ name: 'AvatarFallback' })).toHaveLength(2)

    const withoutAvatar = mountMenu()
    expect(withoutAvatar.find('img').exists()).toBe(false)
    expect(withoutAvatar.findAllComponents({ name: 'AvatarFallback' })).toHaveLength(2)
  })

  it('uses a neutral user icon when initials are empty', () => {
    const wrapper = mountMenu({ user: { name: 'Анна Смирнова', email: 'anna@example.ru', initials: '' } })

    expect(wrapper.findAllComponents({ name: 'IconUser' })).toHaveLength(2)
  })

  it('offers localized actions, removes demo actions, and emits intent events', async () => {
    const wrapper = mountMenu()

    expect(wrapper.text()).toContain('Профиль')
    expect(wrapper.text()).toContain('Выйти')
    expect(wrapper.text()).not.toMatch(/Account|Billing|Notifications/)

    const actions = wrapper.findAll('button')
    await actions.find(button => button.text() === 'Профиль')!.trigger('click')
    await actions.find(button => button.text() === 'Выйти')!.trigger('click')
    expect(wrapper.emitted('profile')).toHaveLength(1)
    expect(wrapper.emitted('logout')).toHaveLength(1)
  })

  it('disables logout while pending and displays a compact safe error alert', () => {
    const wrapper = mountMenu({ logoutPending: true, logoutError: 'Не удалось выйти. Повторите попытку.' })
    const logout = wrapper.findAll('button').find(button => button.text() === 'Выход…')!

    expect(logout.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[role="alert"]').text()).toBe('Не удалось выйти. Повторите попытку.')
  })
})
