import type { AdministrationAuditEvent } from '../../../../shared/administration/contracts'

const CHANNEL_LABELS: Readonly<Record<AdministrationAuditEvent['channel'], string>> = {
  web: 'Веб',
  api: 'API',
  mcp: 'MCP',
  system: 'Система',
}

const OUTCOME_LABELS: Readonly<Record<AdministrationAuditEvent['outcome'], string>> = {
  succeeded: 'Успешно',
  failed: 'Ошибка',
}

const DETAIL_LABELS: Readonly<Record<AdministrationAuditEvent['details'][number]['key'], string>> = {
  revision: 'Ревизия',
  versionNumber: 'Версия',
  grantCount: 'Доступы',
  resultCount: 'Результаты',
}

export const administrationAuditChannelLabel = (value: AdministrationAuditEvent['channel']) => CHANNEL_LABELS[value]
export const administrationAuditOutcomeLabel = (value: AdministrationAuditEvent['outcome']) => OUTCOME_LABELS[value]
export const administrationAuditDetailLabel = (value: AdministrationAuditEvent['details'][number]['key']) => DETAIL_LABELS[value]
export const administrationAuditDateLabel = (value: string) => new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'short',
  timeStyle: 'medium',
}).format(new Date(value))
