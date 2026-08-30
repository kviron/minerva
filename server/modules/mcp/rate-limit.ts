import { createHmac } from 'node:crypto'
import type { ReturnTypeOfGetDatabase } from './runtime-types'

type McpRateLimitInput = Readonly<{
  database: ReturnTypeOfGetDatabase
  secret: string
  ip: string
  token: string
  nowEpochSeconds: number
  max: number
  windowSeconds: number
}>

export async function consumeMcpRateLimit(input: McpRateLimitInput): Promise<boolean> {
  const key = createHmac('sha256', input.secret)
    .update(`mcp:${input.ip}:${input.token}`)
    .digest('hex')
  const rows = await input.database.queryClient<{ count: number }[]>`
    insert into rate_limit (key, count, last_request)
    values (${key}, 1, ${input.nowEpochSeconds})
    on conflict (key) do update set
      count = case
        when ${input.nowEpochSeconds} - rate_limit.last_request >= ${input.windowSeconds} then 1
        else rate_limit.count + 1
      end,
      last_request = case
        when ${input.nowEpochSeconds} - rate_limit.last_request >= ${input.windowSeconds} then ${input.nowEpochSeconds}
        else rate_limit.last_request
      end
    returning count
  `
  return (rows[0]?.count ?? input.max + 1) <= input.max
}
