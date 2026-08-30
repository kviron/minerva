import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('administration audit page', () => {
  it('uses the administration shell and the safe audit view', async () => {
    const [page, view, targetDialog, dataGrid, endpoint, service] = await Promise.all([
      read('../../../../app/pages/administration/audit.vue'),
      read('../../../../app/features/administration/ui/AdministrationAuditView.vue'),
      read('../../../../app/features/administration/ui/AdministrationAuditTargetDialog.vue'),
      read('../../../../app/shared/data-grid/ui/DataGrid.vue'),
      read('../../../../server/api/administration/audit.get.ts'),
      read('../../../../server/modules/administration/list-audit-events.ts'),
    ])

    expect(page).toContain('<AdministrationTabs active="audit" />')
    expect(page).toContain('<AdministrationAuditView />')
    expect(view).toContain('<UiFieldGroup')
    expect(view).toContain('for="audit-project"')
    expect(view).toContain('v-model="projectId"')
    expect(view).toContain('v-model="search"')
    expect(view).toContain('v-for="project in projects"')
    expect(view).toContain('v-if="hasActiveFilters"')
    expect(view).toContain('@click="resetFilters"')
    expect(view).toContain('xl:grid-cols-[minmax(16rem,2fr)_repeat(4,minmax(0,1fr))_auto]')
    expect(view).toContain('class="w-max justify-end"')
    expect(view).not.toContain('type="submit"')
    expect(view).not.toContain('>Применить</UiButton>')
    expect(view).toContain('watchDebounced')
    expect(view).toContain('<DataGrid')
    expect(view).toContain('grid-id="administration-audit"')
    expect(dataGrid).toContain('<colgroup>')
    expect(view).toContain('<UiPagination')
    expect(view).toContain('@sort="setSort"')
    expect(view).not.toContain('Показать ещё')
    expect(view).toContain(':items-per-page="ADMINISTRATION_AUDIT_PAGE_SIZE"')
    expect(dataGrid).toContain('columnResizeMode: \'onChange\'')
    expect(dataGrid).toContain('@mousedown="header.getResizeHandler()($event)"')
    expect(dataGrid).toContain('@touchstart="header.getResizeHandler()($event)"')
    expect(dataGrid).toContain("emit('sort', field)")
    expect(view).toContain('class="h-14')
    expect(view).toContain('<UiBadge')
    expect(view).toContain('selectedTargetEvent = event')
    expect(view).toContain('<AdministrationAuditTargetDialog')
    expect(targetDialog).toContain('<UiDialogTitle>')
    expect(targetDialog).toContain('Показано текущее состояние')
    expect(view).toContain('<UiSkeleton')
    expect(view).toContain('<UiEmpty')
    expect(endpoint).toContain('await requireSuperAdmin(event)')
    expect(endpoint).toContain("'Cache-Control', 'private, no-store'")
    expect(service).toContain("action: 'administration.audit_viewed'")
    expect(service).not.toMatch(/select\(\)|return rows/)
  })
})
