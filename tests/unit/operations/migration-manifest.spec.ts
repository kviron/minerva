import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { REQUIRED_MIGRATION_CREATED_AT } from '../../../server/config/migration-manifest'

type MigrationJournal = Readonly<{
  entries: readonly Readonly<{ when: number }>[]
}>

const isMigrationJournal = (value: unknown): value is MigrationJournal => {
  if (typeof value !== 'object' || value === null || !('entries' in value) || !Array.isArray(value.entries)) {
    return false
  }
  return value.entries.every(entry => typeof entry === 'object'
    && entry !== null
    && 'when' in entry
    && typeof entry.when === 'number')
}

describe('production migration manifest', () => {
  it('tracks the latest accepted Drizzle migration', async () => {
    const decoded: unknown = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'))
    expect(isMigrationJournal(decoded)).toBe(true)
    if (!isMigrationJournal(decoded)) return

    const latest = decoded.entries.at(-1)
    expect(latest?.when).toBe(REQUIRED_MIGRATION_CREATED_AT)
  })
})
