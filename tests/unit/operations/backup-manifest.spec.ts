import { describe, expect, it } from 'vitest'

import {
  BACKUP_FRESHNESS_STATUS,
  createBackupManifest,
  evaluateBackupFreshness,
  parseBackupManifest,
} from '../../../server/modules/operations/backup-manifest'

const input = {
  createdAt: '2026-08-06T00:00:00.000Z',
  migrationCreatedAt: 1_785_695_024_192,
  appImageDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  dumpSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
}

describe('backup manifest', () => {
  it('creates and parses a content-free immutable manifest', () => {
    const manifest = createBackupManifest(input)

    expect(manifest).toEqual({ formatVersion: 1, ...input, dumpFilename: 'minerva.dump' })
    expect(parseBackupManifest(JSON.stringify(manifest))).toEqual(manifest)
    expect(JSON.stringify(manifest)).not.toMatch(/database|bucket|credential|document|password|path/iu)
  })

  it.each([
    '{}',
    JSON.stringify({ ...createBackupManifest(input), formatVersion: 2 }),
    JSON.stringify({ ...createBackupManifest(input), dumpSha256: 'not-a-checksum' }),
    JSON.stringify({ ...createBackupManifest(input), appImageDigest: 'latest' }),
    JSON.stringify({ ...createBackupManifest(input), extra: 'forbidden' }),
  ])('rejects invalid or broadened input', (serialized) => {
    expect(() => parseBackupManifest(serialized)).toThrow('Invalid backup manifest')
  })
})

describe('backup freshness', () => {
  it('reports a backup within the 24-hour RPO as fresh', () => {
    expect(evaluateBackupFreshness({
      latestSnapshotAt: '2026-08-05T12:00:00.000Z',
      checkedAt: '2026-08-06T00:00:00.000Z',
      maximumAgeMs: 86_400_000,
    })).toEqual({ status: BACKUP_FRESHNESS_STATUS.FRESH, ageSeconds: 43_200 })
  })

  it('reports missing, stale, future, and invalid snapshots without detail', () => {
    expect(evaluateBackupFreshness({ latestSnapshotAt: null, checkedAt: input.createdAt, maximumAgeMs: 86_400_000 }))
      .toEqual({ status: BACKUP_FRESHNESS_STATUS.MISSING })
    expect(evaluateBackupFreshness({ latestSnapshotAt: '2026-08-04T00:00:00.000Z', checkedAt: input.createdAt, maximumAgeMs: 86_400_000 }).status)
      .toBe(BACKUP_FRESHNESS_STATUS.STALE)
    expect(evaluateBackupFreshness({ latestSnapshotAt: '2026-08-07T00:00:00.000Z', checkedAt: input.createdAt, maximumAgeMs: 86_400_000 }).status)
      .toBe(BACKUP_FRESHNESS_STATUS.INVALID)
    expect(evaluateBackupFreshness({ latestSnapshotAt: 'invalid', checkedAt: input.createdAt, maximumAgeMs: 86_400_000 }).status)
      .toBe(BACKUP_FRESHNESS_STATUS.INVALID)
  })
})
