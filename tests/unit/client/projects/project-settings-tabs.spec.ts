import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const readSettingsPage = () => readFile(
  new URL('../../../../app/pages/projects/[id]/settings.vue', import.meta.url),
  'utf8',
)

describe('project settings tabs', () => {
  it('renders General first and Members second with content inside Tabs', async () => {
    const page = await readSettingsPage()
    const generalTrigger = page.indexOf('>Основные</UiTabsTrigger>')
    const membersTrigger = page.indexOf('>Участники</UiTabsTrigger>')

    expect(page).toContain('<UiTabs v-model="activeTab"')
    expect(page).toContain('<UiTabsList>')
    expect(generalTrigger).toBeGreaterThan(-1)
    expect(membersTrigger).toBeGreaterThan(generalTrigger)
    expect(page).toContain(':value="PROJECT_SETTINGS_TAB.GENERAL"')
    expect(page).toContain(':value="PROJECT_SETTINGS_TAB.MEMBERS"')
  })

  it('gives AI settings a dedicated permission-gated tab and keeps Members project-scoped', async () => {
    const page = await readSettingsPage()
    const assistantTrigger = page.indexOf(':value="PROJECT_SETTINGS_TAB.AI_ASSISTANT"')
    const assistantSettings = page.indexOf('<ProjectAiConnectionSettings')
    const membersContent = page.indexOf(':value="PROJECT_SETTINGS_TAB.MEMBERS"', assistantSettings)

    expect(assistantTrigger).toBeGreaterThan(-1)
    expect(page).toContain('<UiTabsContent\n            v-if="project.permissions.includes(PROJECT_PERMISSION.PROJECT_AI_MANAGE)"')
    expect(assistantSettings).toBeGreaterThan(assistantTrigger)
    expect(membersContent).toBeGreaterThan(assistantSettings)
    expect(page).toContain('PROJECT_PERMISSION.PROJECT_AI_MANAGE')
    expect(page).toContain('<ProjectMembersSettings')
  })

  it('opens the AI tab from the assistant configuration link when permitted', async () => {
    const page = await readSettingsPage()

    expect(page).toContain("route.query.tab === PROJECT_SETTINGS_TAB.AI_ASSISTANT")
    expect(page).toContain('PROJECT_PERMISSION.PROJECT_AI_MANAGE')
  })
})
