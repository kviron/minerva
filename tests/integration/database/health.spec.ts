import { expect, it } from 'vitest'
import { checkDatabase } from '../../../server/infrastructure/database/health'

it('reports a real PostgreSQL connection as ready', async () => {
  await expect(
    checkDatabase('postgresql://minerva:minerva@127.0.0.1:5433/minerva_test'),
  ).resolves.toEqual({ database: 'ok' })
})
