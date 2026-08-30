import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('project AI connection settings UI', () => {
  it('uses the project permission and established shadcn-vue form composition', async () => {
    const [page, view] = await Promise.all([
      readFile('app/pages/projects/[id]/settings.vue', 'utf8'),
      readFile('app/features/ai-assistant/ui/ProjectAiConnectionSettings.vue', 'utf8'),
    ])

    expect(page).toContain('PROJECT_PERMISSION.PROJECT_AI_MANAGE')
    expect(page).toContain('<ProjectAiConnectionSettings')
    expect(view).toContain('<UiCard')
    expect(view).toContain('<UiFieldGroup>')
    expect(view).toContain('<UiSelectGroup>')
    expect(view).toContain('<UiSwitch')
    expect(view).toContain('<UiAlertDialogTitle>')
    expect(view).toContain('type="password"')
    expect(view).not.toContain('v-html')
  })
})
