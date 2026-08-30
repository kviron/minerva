import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectAssistantStore } from '../../../../app/features/ai-assistant/model/assistant-state'

const firstProjectId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'
const secondProjectId = '22b9fc31-6e20-4399-a2ea-fb4de1024821'
const documentId = '31b9fc31-6e20-4399-a2ea-fb4de1024821'

beforeEach(() => setActivePinia(createPinia()))

describe('project assistant active conversation projection', () => {
  it('hydrates and prepends validated history without losing the selected conversation', () => {
    const store = useProjectAssistantStore()
    store.open(firstProjectId)
    store.selectConversation('41b9fc31-6e20-4399-a2ea-fb4de1024821')
    store.hydrateMessages([{
      id: 'message-2',
      role: 'assistant',
      content: 'Второй ответ',
      citations: [],
      createdAt: '2026-07-30T12:01:00.000Z',
    }], 'older')
    store.hydrateMessages([{
      id: 'message-1',
      role: 'user',
      content: 'Первый вопрос',
      citations: [],
      createdAt: '2026-07-30T12:00:00.000Z',
    }], null, true)

    expect(store.messages.map(message => message.id)).toEqual(['message-1', 'message-2'])
    expect(store.messagesNextCursor).toBeNull()
    expect(store.conversationId).toBe('41b9fc31-6e20-4399-a2ea-fb4de1024821')
  })

  it('applies streamed turns immutably and keeps only validated citations', () => {
    const store = useProjectAssistantStore()
    store.open(firstProjectId)
    store.startTurn({
      userMessageId: 'user-1',
      assistantMessageId: 'assistant-1',
      question: 'Как проверяются права?',
    })
    const messagesBeforeDelta = store.messages

    store.appendDelta('assistant-1', 'Права ')
    store.appendDelta('assistant-1', 'проверяются на сервере.')
    store.completeTurn('assistant-1', [{ documentId, title: 'Авторизация' }])

    expect(store.messages).not.toBe(messagesBeforeDelta)
    expect(store.messages).toEqual([
      expect.objectContaining({ role: 'user', content: 'Как проверяются права?' }),
      expect.objectContaining({
        role: 'assistant',
        content: 'Права проверяются на сервере.',
        status: 'completed',
        citations: [{ documentId, title: 'Авторизация' }],
      }),
    ])
    expect(store.activeAssistantMessageId).toBeNull()
  })

  it('clears messages, errors, retry context, and open state on project change', () => {
    const store = useProjectAssistantStore()
    store.open(firstProjectId)
    store.startTurn({
      userMessageId: 'user-1',
      assistantMessageId: 'assistant-1',
      question: 'Первый проект',
    })
    store.failTurn('assistant-1', 'Провайдер недоступен')

    store.activateProject(secondProjectId)

    expect(store.projectId).toBe(secondProjectId)
    expect(store.isOpen).toBe(false)
    expect(store.messages).toEqual([])
    expect(store.error).toBeNull()
    expect(store.retryQuestion).toBeNull()
  })

  it('preserves the active conversation when only the route changes inside one project', () => {
    const store = useProjectAssistantStore()
    store.open(firstProjectId)
    store.startTurn({
      userMessageId: 'user-1',
      assistantMessageId: 'assistant-1',
      question: 'Один проект',
    })

    store.activateProject(firstProjectId)

    expect(store.isOpen).toBe(true)
    expect(store.messages).toHaveLength(2)
    expect(store.activeAssistantMessageId).toBe('assistant-1')
  })
})
