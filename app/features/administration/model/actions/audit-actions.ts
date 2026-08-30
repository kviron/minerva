import type { AdministrationAuditQuery } from '../../../../../shared/administration/contracts'
import { BaseActions, type BaseActionsOptions } from '../../../../shared/model/baseActions'
import { administrationAuditApi } from '../../api/audit-api'

export class AdministrationAuditActions extends BaseActions {
  constructor(options: BaseActionsOptions = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'administration-audit' })
  }

  public list = this.createAsyncAction({
    name: 'administration-audit.list',
    run: (signal: AbortSignal, query: AdministrationAuditQuery) =>
      administrationAuditApi.list(query, signal),
    idGetter: query => query.page,
    options: {
      concurrency: 'abort',
      mutation: false,
      errorMessage: 'Не удалось загрузить журнал аудита.',
    },
  })

  public listProjects = this.createAsyncAction({
    name: 'administration-audit.projects.list',
    run: (signal: AbortSignal) => administrationAuditApi.listProjects(signal),
    idGetter: () => 'projects',
    options: {
      concurrency: 'abort',
      mutation: false,
      errorMessage: 'Не удалось загрузить список проектов.',
    },
  })

  public getTarget = this.createAsyncAction({
    name: 'administration-audit.target.get',
    run: (signal: AbortSignal, auditEventId: string) => administrationAuditApi.getTarget(auditEventId, signal),
    idGetter: auditEventId => auditEventId,
    options: {
      concurrency: 'abort',
      mutation: false,
      errorMessage: 'Не удалось загрузить текущее состояние объекта.',
    },
  })
}
