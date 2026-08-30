import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectAssistantStreamEvent } from '../../../../shared/ai-assistant/contracts'
import { ProjectAssistantActions } from '../../../../app/features/ai-assistant/model/actions/assistant-actions'

const stream = vi.fn()

const createActions = () => new ProjectAssistantActions({}, { turnsApi: { stream } })

const projectId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'
const conversationId = '31b9fc31-6e20-4399-a2ea-fb4de1024821'

const events = async function* (): AsyncGenerator<ProjectAssistantStreamEvent> {
  yield { type: 'context', citations: [] }
  yield { type: 'delta', delta: 'Готовый ответ.' }
  yield { type: 'completed', citations: [], usage: { inputTokens: 10, outputTokens: 2 } }
}

beforeEach(() => stream.mockReset())

describe('project assistant actions', () => {
  it('keeps Pinia out of the action boundary required by ADR 0013', async () => {
    const source = await readFile(new URL(
      '../../../../app/features/ai-assistant/model/actions/assistant-actions.ts',
      import.meta.url,
    ), 'utf8')

    expect(source).toContain('extends BaseActions')
    expect(source).not.toContain("from 'pinia'")
    expect(source).not.toContain('assistant-state')
  })

  it('returns UI commands without importing or mutating Pinia', () => {
    const actions = createActions()

    expect(actions.open(projectId)).toEqual({ type: 'project-assistant.open', projectId })
    expect(actions.newConversation(projectId)).toEqual({
      type: 'project-assistant.new-conversation',
      projectId,
    })
  })

  it('streams validated events through an explicit callback', async () => {
    stream.mockReturnValue(events())
    const actions = createActions()
    const onEvent = vi.fn()

    await actions.send(projectId, conversationId, 'Что написано в документации?', onEvent)

    expect(stream).toHaveBeenCalledWith(
      projectId,
      conversationId,
      'Что написано в документации?',
      expect.any(AbortSignal),
    )
    expect(onEvent).toHaveBeenCalledTimes(3)
  })

  it('cancels an active request through BaseActions cancellation ownership', async () => {
    let requestSignal: AbortSignal | null = null
    stream.mockImplementation((_projectId: string, _conversationId: string, _question: string, signal: AbortSignal) => {
      requestSignal = signal
      return (async function* (): AsyncGenerator<ProjectAssistantStreamEvent> {
        await new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }))
      })()
    })
    const actions = createActions()

    const sending = actions.send(projectId, conversationId, 'Долгий вопрос', vi.fn())
    actions.cancel(projectId)
    await sending

    expect(requestSignal?.aborted).toBe(true)
  })
})
