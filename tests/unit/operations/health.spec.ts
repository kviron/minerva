import { describe, expect, it, vi } from 'vitest'
import { createReadinessCheck } from '../../../server/modules/operations/health'

describe('production health boundary', () => {
  it('reports readiness only after configuration, database, migrations, and storage pass', async () => {
    const calls: string[] = []
    const check = createReadinessCheck({
      initializeConfiguration: vi.fn(() => { calls.push('configuration') }),
      checkDatabase: vi.fn(async () => { calls.push('database') }),
      checkMigrations: vi.fn(async () => { calls.push('migrations') }),
      checkObjectStorage: vi.fn(async () => { calls.push('storage') }),
    })

    await expect(check()).resolves.toEqual({ status: 'ok' })
    expect(calls).toEqual(['configuration', 'database', 'migrations', 'storage'])
  })

  it.each(['configuration', 'database', 'migrations', 'storage'] as const)(
    'fails closed when %s is unavailable',
    async (failed) => {
      const fail = (): never => { throw new Error('private dependency detail') }
      const check = createReadinessCheck({
        initializeConfiguration: vi.fn(() => { if (failed === 'configuration') fail() }),
        checkDatabase: vi.fn(async () => { if (failed === 'database') fail() }),
        checkMigrations: vi.fn(async () => { if (failed === 'migrations') fail() }),
        checkObjectStorage: vi.fn(async () => { if (failed === 'storage') fail() }),
      })

      await expect(check()).rejects.toThrow('private dependency detail')
    },
  )
})

