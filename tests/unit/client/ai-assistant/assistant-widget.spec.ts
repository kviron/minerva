import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('project-wide assistant widget architecture', () => {
  it('mounts one provider above routed project pages and the trigger inside ProjectShell', async () => {
    const [layout, shell] = await Promise.all([
      read('../../../../app/layouts/default.vue'),
      read('../../../../app/features/projects/ui/ProjectShell.vue'),
    ])

    expect(layout).toContain('<ProjectAssistantProvider>')
    expect(layout).toContain('</ProjectAssistantProvider>')
    expect(shell).toContain('PROJECT_PERMISSION.PROJECT_AI_USE')
    expect(shell).toContain('<ProjectAssistantWidget')
  })

  it('composes an accessible Sheet with the installed message and form primitives', async () => {
    const widget = await read('../../../../app/features/ai-assistant/ui/ProjectAssistantWidget.vue')

    expect(widget).toContain('<UiSheetTitle>AI-помощник</UiSheetTitle>')
    expect(widget).toContain('<UiMessageScrollerProvider')
    expect(widget).toContain('<UiMessageScrollerViewport')
    expect(widget).toContain('<UiMessageScrollerContent')
    expect(widget).toContain('<UiEmpty')
    expect(widget).toContain('<UiAlert')
    expect(widget).toContain('AI_ASSISTANT_AVAILABILITY.NOT_CONFIGURED')
    expect(widget).toContain('AI-помощник ещё не настроен')
    expect(widget).toContain('actions.loadAvailability(projectId)')
    expect(widget).toContain(':disabled="isStreaming || !isAssistantReady"')
    expect(widget).toContain(':to="`/projects/${projectId}/settings?tab=ai-assistant`"')
    expect(widget).toContain('<UiBadge')
    expect(widget).toContain('<UiSpinner')
    expect(widget).toContain('<UiInputGroupTextarea')
    expect(widget).toContain('@keydown="handleComposerKeydown"')
    expect(widget).not.toContain('v-html')
  })

  it('renders citations as Minerva document links and exposes cancel and retry actions', async () => {
    const widget = await read('../../../../app/features/ai-assistant/ui/ProjectAssistantWidget.vue')

    expect(widget).toContain('`/projects/${projectId}/documents/${citation.documentId}`')
    expect(widget).toContain('actions.cancel(projectId)')
    expect(widget).toContain('@click="retry"')
    expect(widget).toContain('store.activateProject(nextProjectId)')
  })

  it('keeps history and recoverable trash inside the same assistant sheet', async () => {
    const widget = await read('../../../../app/features/ai-assistant/ui/ProjectAssistantWidget.vue')

    expect(widget).toContain('<UiDropdownMenu>')
    expect(widget).toContain('AI_CONVERSATION_STATUS.ACTIVE')
    expect(widget).toContain('AI_CONVERSATION_STATUS.TRASH')
    expect(widget).toContain('store.hydrateMessages(page.messages, page.nextCursor, true)')
    expect(widget).toContain('actions.restoreConversation')
  })
})
