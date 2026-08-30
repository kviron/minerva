import { computed, readonly, ref } from 'vue'
import type {
  AdministrationAuditEvent,
  AdministrationAuditQuery,
} from '../../../../shared/administration/contracts'
import type { AdministrationProjectListItem } from '../../../../shared/projects/contracts'
import {
  ADMINISTRATION_AUDIT_SORT,
  ADMINISTRATION_AUDIT_SORT_DIRECTION,
} from '../../../../shared/administration/contracts'
import { AdministrationAuditActions } from './actions/audit-actions'

const ALL_FILTER = 'all'

export function useAdministrationAudit() {
  const actions = new AdministrationAuditActions()
  const items = ref<readonly AdministrationAuditEvent[]>([])
  const page = ref(1)
  const totalItems = ref(0)
  const totalPages = ref(1)
  const sort = ref<AdministrationAuditQuery['sort']>(ADMINISTRATION_AUDIT_SORT.CREATED_AT)
  const direction = ref<AdministrationAuditQuery['direction']>(ADMINISTRATION_AUDIT_SORT_DIRECTION.DESC)
  const channel = ref<typeof ALL_FILTER | AdministrationAuditEvent['channel']>(ALL_FILTER)
  const outcome = ref<typeof ALL_FILTER | AdministrationAuditEvent['outcome']>(ALL_FILTER)
  const search = ref('')
  const action = ref('')
  const projectId = ref<typeof ALL_FILTER | string>(ALL_FILTER)
  const projects = ref<readonly AdministrationProjectListItem[]>([])

  const query = (requestedPage: number): AdministrationAuditQuery => ({
    page: requestedPage,
    sort: sort.value,
    direction: direction.value,
    ...(channel.value === ALL_FILTER ? {} : { channel: channel.value }),
    ...(outcome.value === ALL_FILTER ? {} : { outcome: outcome.value }),
    ...(search.value.trim() === '' ? {} : { search: search.value.trim() }),
    ...(action.value.trim() === '' ? {} : { action: action.value.trim() }),
    ...(projectId.value === ALL_FILTER ? {} : { projectId: projectId.value }),
  })

  const load = async (requestedPage = 1) => {
    const response = await actions.list(query(requestedPage))
    if (response === undefined) return
    items.value = response.items
    page.value = response.page
    totalItems.value = response.totalItems
    totalPages.value = response.totalPages
  }

  const setSort = async (field: AdministrationAuditQuery['sort']) => {
    if (sort.value === field) {
      direction.value = direction.value === ADMINISTRATION_AUDIT_SORT_DIRECTION.ASC
        ? ADMINISTRATION_AUDIT_SORT_DIRECTION.DESC
        : ADMINISTRATION_AUDIT_SORT_DIRECTION.ASC
    }
    else {
      sort.value = field
      direction.value = field === ADMINISTRATION_AUDIT_SORT.CREATED_AT
        ? ADMINISTRATION_AUDIT_SORT_DIRECTION.DESC
        : ADMINISTRATION_AUDIT_SORT_DIRECTION.ASC
    }
    await load(1)
  }

  const loadProjects = async () => {
    const response = await actions.listProjects()
    if (response !== undefined) projects.value = response
  }

  const hasActiveFilters = computed(() => channel.value !== ALL_FILTER
    || outcome.value !== ALL_FILTER
    || projectId.value !== ALL_FILTER
    || search.value.trim() !== ''
    || action.value.trim() !== '')

  const resetFilters = (): void => {
    channel.value = ALL_FILTER
    outcome.value = ALL_FILTER
    projectId.value = ALL_FILTER
    search.value = ''
    action.value = ''
  }

  return {
    items: readonly(items),
    page: readonly(page),
    totalItems: readonly(totalItems),
    totalPages: readonly(totalPages),
    sort: readonly(sort),
    direction: readonly(direction),
    channel,
    outcome,
    search,
    action,
    projectId,
    projects: readonly(projects),
    pending: computed(() => actions.isPending.value),
    hasActiveFilters,
    error: computed(() => actions.error.value ?? ''),
    load,
    loadProjects,
    resetFilters,
    setSort,
  }
}
