import { createHmac } from 'node:crypto'
import { getServerEnv } from '../../config/runtime-env'
import { getDatabase } from '../../infrastructure/database/client'

const FAILURE_LIMIT = 30
const WINDOW_SECONDS = 60

interface Input {
  readonly ip: string
}

interface Dependencies {
  readonly secret: () => string
  readonly now: () => number
  readonly increment: (key: string, now: number, windowSeconds: number) => Promise<number>
}

export const createPublicDocumentationFailureRateLimit = (dependencies: Dependencies) =>
  async ({ ip }: Input): Promise<boolean> => {
    const key = createHmac('sha256', dependencies.secret())
      .update(`public-documentation-failure:${ip}`)
      .digest('hex')
    const now = dependencies.now()
    const count = await dependencies.increment(key, now, WINDOW_SECONDS)
    return count <= FAILURE_LIMIT
  }

const incrementPersistentFailureCount = async (
  key: string,
  now: number,
  windowSeconds: number,
): Promise<number> => {
  const { queryClient } = getDatabase()
  const rows = await queryClient<{ count: number }[]>`
      insert into rate_limit (key, count, last_request)
      values (${key}, 1, ${now})
      on conflict (key) do update set
        count = case
          when ${now} - rate_limit.last_request >= ${windowSeconds} then 1
          else rate_limit.count + 1
        end,
        last_request = case
          when ${now} - rate_limit.last_request >= ${windowSeconds} then ${now}
          else rate_limit.last_request
        end
      returning count
    `
  return rows[0]?.count ?? FAILURE_LIMIT + 1
}

export const consumePublicDocumentationFailureRateLimit = createPublicDocumentationFailureRateLimit({
  secret: () => getServerEnv().RATE_LIMIT_HMAC_SECRET,
  now: () => Math.floor(Date.now() / 1000),
  increment: incrementPersistentFailureCount,
})
