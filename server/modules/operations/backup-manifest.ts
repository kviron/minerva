import { z } from 'zod'

export const BACKUP_FRESHNESS_STATUS = {
  FRESH: 'fresh',
  STALE: 'stale',
  MISSING: 'missing',
  INVALID: 'invalid',
} as const

const canonicalTimestamp = z.string().refine((value) => {
  const epoch = Date.parse(value)
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value
})

const backupManifestSchema = z.object({
  formatVersion: z.literal(1),
  createdAt: canonicalTimestamp,
  migrationCreatedAt: z.number().int().positive(),
  appImageDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/u),
  dumpSha256: z.string().regex(/^[0-9a-f]{64}$/u),
  dumpFilename: z.literal('minerva.dump'),
}).strict()

export type BackupManifest = Readonly<z.infer<typeof backupManifestSchema>>

type CreateBackupManifestInput = Readonly<Omit<BackupManifest, 'formatVersion' | 'dumpFilename'>>

export const createBackupManifest = (input: CreateBackupManifestInput): BackupManifest =>
  backupManifestSchema.parse({ formatVersion: 1, ...input, dumpFilename: 'minerva.dump' })

export const parseBackupManifest = (serialized: string): BackupManifest => {
  try {
    return backupManifestSchema.parse(JSON.parse(serialized))
  }
  catch {
    throw new Error('Invalid backup manifest')
  }
}

type BackupFreshnessInput = Readonly<{
  latestSnapshotAt: string | null
  checkedAt: string
  maximumAgeMs: number
}>

export type BackupFreshness =
  | Readonly<{ status: typeof BACKUP_FRESHNESS_STATUS.FRESH | typeof BACKUP_FRESHNESS_STATUS.STALE, ageSeconds: number }>
  | Readonly<{ status: typeof BACKUP_FRESHNESS_STATUS.MISSING | typeof BACKUP_FRESHNESS_STATUS.INVALID }>

export const evaluateBackupFreshness = (input: BackupFreshnessInput): BackupFreshness => {
  if (input.latestSnapshotAt === null) return { status: BACKUP_FRESHNESS_STATUS.MISSING }
  const snapshotAt = Date.parse(input.latestSnapshotAt)
  const checkedAt = Date.parse(input.checkedAt)
  if (!Number.isFinite(snapshotAt) || !Number.isFinite(checkedAt) || !Number.isSafeInteger(input.maximumAgeMs) || input.maximumAgeMs < 1) {
    return { status: BACKUP_FRESHNESS_STATUS.INVALID }
  }
  const ageMs = checkedAt - snapshotAt
  if (ageMs < 0) return { status: BACKUP_FRESHNESS_STATUS.INVALID }
  return {
    status: ageMs <= input.maximumAgeMs ? BACKUP_FRESHNESS_STATUS.FRESH : BACKUP_FRESHNESS_STATUS.STALE,
    ageSeconds: Math.floor(ageMs / 1_000),
  }
}
