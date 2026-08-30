import { createHmac } from 'node:crypto'
import { getServerEnv } from '../../config/runtime-env'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { getDatabase } from '../../infrastructure/database/client'
import { IdentityError } from './identity-error'

export interface RateLimitInput {
  scope: 'sign-in' | 'recovery-request' | 'password-reset' | 'credential-reveal'
  ip: string
  identity?: string
  max: number
  windowSeconds: number
}

type RateLimitKeyInput = Pick<RateLimitInput, 'scope' | 'ip' | 'identity'>

export interface RateLimitDependencies {
  readonly getSecret: () => string
  readonly getDatabase: typeof getDatabase
  readonly now: () => number
}

export function createRateLimitKey(secret: string, input: RateLimitKeyInput): string {
  return createHmac('sha256', secret)
    .update(`${input.scope}:${input.ip}:${input.identity ?? ''}`)
    .digest('hex')
}

export function createIdentityRateLimiter(dependencies: RateLimitDependencies) {
  return async function consume(input: RateLimitInput): Promise<void> {
    const key = createRateLimitKey(dependencies.getSecret(), input)
    const now = dependencies.now()
    const database = dependencies.getDatabase()
    const rows = await database.queryClient<{ count: number }[]>`
    insert into rate_limit (key, count, last_request)
    values (${key}, 1, ${now})
    on conflict (key) do update set
      count = case
        when ${now} - rate_limit.last_request >= ${input.windowSeconds} then 1
        else rate_limit.count + 1
      end,
      last_request = case
        when ${now} - rate_limit.last_request >= ${input.windowSeconds} then ${now}
        else rate_limit.last_request
      end
    returning count
  `

    if ((rows[0]?.count ?? input.max + 1) > input.max) {
      throw new IdentityError(IDENTITY_CODE.RATE_LIMITED)
    }
  }
}

export const consumeIdentityRateLimit = createIdentityRateLimiter({
  getSecret: () => getServerEnv().RATE_LIMIT_HMAC_SECRET,
  getDatabase,
  now: () => Math.floor(Date.now() / 1000),
})
