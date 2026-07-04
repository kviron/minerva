// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ModeToggle from '@/components/modeToggle/index.vue'

const colorMode = { preference: 'system' }
const passthrough = (name: string, template = '<div><slot /></div>') => ({ name, template })
const DropdownMenuItem = {
  name: 'DropdownMenuItem',
  template: '<button type="button"><slot /></button>',
}

const mountToggle = () => mount(ModeToggle, {
  global: {
    stubs: {
      Button: passthrough('Button', '<button type="button"><slot /></button>'),
      DropdownMenu: passthrough('DropdownMenu'),
      DropdownMenuContent: passthrough('DropdownMenuContent'),
      DropdownMenuItem,
      DropdownMenuTrigger: passthrough('DropdownMenuTrigger'),
      Moon: true,
      Sun: true,
    },
  },
})

describe('ModeToggle', () => {
  beforeEach(() => {
    colorMode.preference = 'system'
    vi.stubGlobal('useColorMode', () => colorMode)
  })

  it('exposes a Russian trigger and all supported preferences', () => {
    const wrapper = mountToggle()

    expect(wrapper.get('[aria-label="Переключить тему"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(DropdownMenuItem).map(item => item.text())).toEqual([
      'Светлая',
      'Тёмная',
      'Системная',
    ])
  })

  it.each([
    ['Светлая', 'light'],
    ['Тёмная', 'dark'],
    ['Системная', 'system'],
  ])('sets %s preference', async (label, preference) => {
    const wrapper = mountToggle()
    const item = wrapper.findAllComponents(DropdownMenuItem).find(candidate => candidate.text() === label)

    await item?.trigger('click')

    expect(colorMode.preference).toBe(preference)
  })
})
