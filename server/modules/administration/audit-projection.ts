import type {
  AdministrationAuditDetail,
  AdministrationAuditEvent,
} from '../../../shared/administration/contracts'
import type { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import type { AUDIT_CHANNEL, AUDIT_OUTCOME } from '../../../shared/projects/constants'

type AccountStatus = typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS]
type AuditChannel = typeof AUDIT_CHANNEL[keyof typeof AUDIT_CHANNEL]
type AuditOutcome = typeof AUDIT_OUTCOME[keyof typeof AUDIT_OUTCOME]

export interface AdministrationAuditRow {
  readonly id: string
  readonly createdAt: Date
  readonly actorUserId: string | null
  readonly actorName: string | null
  readonly actorStatus: AccountStatus | null
  readonly projectId: string | null
  readonly projectName: string | null
  readonly channel: AuditChannel
  readonly action: string
  readonly outcome: AuditOutcome
  readonly targetType: string
  readonly targetId: string | null
  readonly metadata: unknown
}

const SAFE_NUMBER_DETAIL_KEYS: readonly AdministrationAuditDetail['key'][] = [
  'revision',
  'versionNumber',
  'grantCount',
  'resultCount',
]

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const projectAdministrationAuditDetails = (metadata: unknown): readonly AdministrationAuditDetail[] => {
  if (!isRecord(metadata)) return []

  return SAFE_NUMBER_DETAIL_KEYS.flatMap((key): readonly AdministrationAuditDetail[] => {
    const value = metadata[key]
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
      ? [{ key, value }]
      : []
  })
}

export const projectAdministrationAuditEvent = (
  row: AdministrationAuditRow,
): AdministrationAuditEvent => ({
  id: row.id,
  createdAt: row.createdAt.toISOString(),
  actor: row.actorUserId !== null && row.actorName !== null && row.actorStatus !== null
    ? { id: row.actorUserId, name: row.actorName, status: row.actorStatus }
    : null,
  project: row.projectId !== null && row.projectName !== null
    ? { id: row.projectId, name: row.projectName }
    : null,
  channel: row.channel,
  action: row.action,
  outcome: row.outcome,
  targetType: row.targetType,
  targetId: row.targetId,
  details: projectAdministrationAuditDetails(row.metadata),
})
