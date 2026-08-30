import type { ProjectAssistantStreamEvent } from '../../../../shared/ai-assistant/contracts'
import { projectAssistantStreamEventSchema } from '../../../../shared/ai-assistant/contracts'
import { AI_ASSISTANT_STREAM_EVENT } from '../../../../shared/ai-assistant/constants'

const MAX_CLIENT_SSE_BUFFER_LENGTH = 64 * 1024

export type AssistantStreamRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export class InvalidAssistantStreamError extends Error {
  constructor() {
    super('Invalid assistant stream')
    this.name = 'InvalidAssistantStreamError'
  }
}

export class ProjectAssistantStreamRequestError extends Error {
  constructor(readonly status: number) {
    super('Assistant request failed')
    this.name = 'ProjectAssistantStreamRequestError'
  }
}

const parseEventBlock = (block: string): ProjectAssistantStreamEvent | null => {
  const lines = block.split(/\r?\n/u)
  let eventName: string | null = null
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim()
      continue
    }
    if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trimStart())
  }

  if (dataLines.length === 0) return null

  let value: unknown
  try {
    value = JSON.parse(dataLines.join('\n'))
  }
  catch {
    throw new InvalidAssistantStreamError()
  }

  const parsed = projectAssistantStreamEventSchema.safeParse(value)
  if (!parsed.success || (eventName !== null && eventName !== parsed.data.type)) {
    throw new InvalidAssistantStreamError()
  }
  return parsed.data
}

const isTerminalEvent = (event: ProjectAssistantStreamEvent): boolean =>
  event.type === AI_ASSISTANT_STREAM_EVENT.COMPLETED
  || event.type === AI_ASSISTANT_STREAM_EVENT.ERROR

export const createProjectAssistantTurnsApi = (
  request: AssistantStreamRequest = globalThis.fetch.bind(globalThis),
) => ({
  async *stream(
    projectId: string,
    conversationId: string,
    question: string,
    signal: AbortSignal,
  ): AsyncGenerator<ProjectAssistantStreamEvent> {
    const endpoint = `/api/projects/${encodeURIComponent(projectId)}/ai-assistant/turn/stream`
    const response = await request(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, conversationId }),
      signal,
    })

    if (!response.ok) throw new ProjectAssistantStreamRequestError(response.status)
    if (!response.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
      throw new InvalidAssistantStreamError()
    }
    if (!response.body) throw new InvalidAssistantStreamError()

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let terminalReceived = false

    try {
      while (true) {
        const chunk = await reader.read()
        buffer += decoder.decode(chunk.value, { stream: !chunk.done })
        if (buffer.length > MAX_CLIENT_SSE_BUFFER_LENGTH) throw new InvalidAssistantStreamError()

        const blocks = buffer.split(/\r?\n\r?\n/u)
        buffer = blocks.pop() ?? ''
        for (const block of blocks) {
          const event = parseEventBlock(block)
          if (!event) continue
          if (terminalReceived) throw new InvalidAssistantStreamError()
          terminalReceived = isTerminalEvent(event)
          yield event
        }

        if (chunk.done) break
      }
    }
    finally {
      reader.releaseLock()
    }

    if (buffer.trim().length > 0 || !terminalReceived) throw new InvalidAssistantStreamError()
  },
})

export const projectAssistantTurnsApi = createProjectAssistantTurnsApi()
