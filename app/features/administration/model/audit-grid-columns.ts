import type { AdministrationAuditQuery } from '../../../../shared/administration/contracts'
import { ADMINISTRATION_AUDIT_SORT } from '../../../../shared/administration/contracts'
import type { DataGridColumn } from '../../../shared/data-grid'

export const ADMINISTRATION_AUDIT_COLUMNS: readonly DataGridColumn<AdministrationAuditQuery['sort']>[] = [
  { id: 'createdAt', label: 'Время', sort: ADMINISTRATION_AUDIT_SORT.CREATED_AT, size: 180, minSize: 160, maxSize: 240 },
  { id: 'action', label: 'Действие', sort: ADMINISTRATION_AUDIT_SORT.ACTION, size: 280, minSize: 220, maxSize: 520 },
  { id: 'actor', label: 'Исполнитель', sort: ADMINISTRATION_AUDIT_SORT.ACTOR, size: 180, minSize: 140, maxSize: 320 },
  { id: 'project', label: 'Проект', sort: ADMINISTRATION_AUDIT_SORT.PROJECT, size: 180, minSize: 140, maxSize: 320 },
  { id: 'channel', label: 'Канал', sort: ADMINISTRATION_AUDIT_SORT.CHANNEL, size: 100, minSize: 88, maxSize: 140 },
  { id: 'outcome', label: 'Результат', sort: ADMINISTRATION_AUDIT_SORT.OUTCOME, size: 120, minSize: 104, maxSize: 160 },
  { id: 'target', label: 'Объект', sort: ADMINISTRATION_AUDIT_SORT.TARGET, size: 320, minSize: 220, maxSize: 600 },
]
