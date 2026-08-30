import { AI_PROVIDER } from '../../../shared/ai-assistant/constants'
import type { TestProjectAiProviderInput } from './project-ai-connections'

type FetchCapability = (
  input: string | URL | globalThis.Request,
  init?: RequestInit,
) => Promise<Response>

export const createProjectAiProviderTester = (request: FetchCapability = fetch) =>
  async (input: TestProjectAiProviderInput): Promise<Readonly<{ reachable: boolean }>> => {
    if (input.provider !== AI_PROVIDER.OPENAI) return { reachable: false }

    try {
      const response = await request(
        `https://api.openai.com/v1/models/${encodeURIComponent(input.model)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${input.apiKey}` },
          redirect: 'error',
          signal: AbortSignal.timeout(input.timeoutMs),
        },
      )
      return { reachable: response.ok }
    }
    catch {
      return { reachable: false }
    }
  }
