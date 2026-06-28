import { createHmac } from 'node:crypto'
import { getServerEnv } from '../../../shared/config/env'
import { getDatabase } from '../../infrastructure/database/client'
import { IdentityError } from './errors'

export interface RateLimitInput {
  scope: 'sign-in' | 'recovery-request' | 'password-reset'
  ip: string
  identity?: string
  max: number
  windowSeconds: number
}

export async function consumeIdentityRateLimit(input: RateLimitInput): Promise<void> {
  const env = getServerEnv()
  const key = createHmac('sha256', env.RATE_LIMIT_HMAC_SECRET)
    .update(`${input.scope}:${input.ip}:${input.identity ?? ''}`)
    .digest('hex')
  const now = Math.floor(Date.now() / 1000)
  const database = getDatabase()
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
    throw new IdentityError('RATE_LIMITED')
  }
}
