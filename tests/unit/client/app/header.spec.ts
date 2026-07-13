// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppHeader from '@/components/app/header/index.vue'

const ModeToggle = {
  name: 'ModeToggle',
  template: '<button data-mode-toggle type="button" />',
}

describe('AppHeader', () => {
  it('renders the theme selector instead of the GitHub link', () => {
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          AppBreadcrumbs: true,
          ModeToggle,
          UiSeparator: true,
          UiSidebarTrigger: true,
        },
      },
    })

    expect(wrapper.getComponent(ModeToggle).exists()).toBe(true)
    expect(wrapper.find('a[href*="github.com"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('GitHub')
  })
})
