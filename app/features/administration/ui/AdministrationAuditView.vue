<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import type { AdministrationAuditEvent } from '../../../../shared/administration/contracts'
import { ADMINISTRATION_AUDIT_PAGE_SIZE } from '../../../../shared/administration/contracts'
import { AUDIT_CHANNEL, AUDIT_OUTCOME } from '../../../../shared/projects/constants'
import { DataGrid } from '../../../shared/data-grid'
import {
  administrationAuditChannelLabel,
  administrationAuditDateLabel,
  administrationAuditDetailLabel,
  administrationAuditOutcomeLabel,
} from '../model/audit-presentation'
import { useAdministrationAudit } from '../model/use-administration-audit'
import { ADMINISTRATION_AUDIT_COLUMNS } from '../model/audit-grid-columns'
import AdministrationAuditTargetDialog from './AdministrationAuditTargetDialog.vue'

const selectedTargetEvent = ref<AdministrationAuditEvent | null>(null)
const setTargetDialogOpen = (open: boolean): void => {
  if (!open) selectedTargetEvent.value = null
}

const {
  items,
  page,
  totalItems,
  totalPages,
  sort,
  direction,
  channel,
  outcome,
  search,
  action,
  projectId,
  projects,
  pending,
  hasActiveFilters,
  error,
  load,
  loadProjects,
  resetFilters,
  setSort,
} = useAdministrationAudit()

onMounted(() => Promise.all([load(), loadProjects()]))
watchDebounced(
  [projectId, channel, outcome, search, action],
  () => load(1),
  { debounce: 350, maxWait: 800 },
)
</script>

<template>
  <div class="flex flex-col gap-4 px-4 lg:px-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold">Журнал аудита</h1>
      <p class="text-sm text-muted-foreground">
        Безопасные сведения о действиях в приложении. Исходные метаданные и содержимое не отображаются.
      </p>
    </div>

    <UiFieldGroup class="grid sm:grid-cols-2 xl:grid-cols-[minmax(16rem,2fr)_repeat(4,minmax(0,1fr))_auto]">
        <UiField>
          <UiFieldLabel for="audit-search">Поиск</UiFieldLabel>
          <UiInput id="audit-search" v-model="search" maxlength="160" placeholder="Действие, пользователь, проект или объект" />
        </UiField>
        <UiField>
          <UiFieldLabel for="audit-project">Проект</UiFieldLabel>
          <UiSelect v-model="projectId">
            <UiSelectTrigger id="audit-project"><UiSelectValue /></UiSelectTrigger>
            <UiSelectContent>
              <UiSelectGroup>
                <UiSelectItem value="all">Все проекты</UiSelectItem>
                <UiSelectItem v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.name }}
                </UiSelectItem>
              </UiSelectGroup>
            </UiSelectContent>
          </UiSelect>
        </UiField>
        <UiField>
          <UiFieldLabel for="audit-channel">Канал</UiFieldLabel>
          <UiSelect v-model="channel">
            <UiSelectTrigger id="audit-channel"><UiSelectValue /></UiSelectTrigger>
            <UiSelectContent>
              <UiSelectGroup>
                <UiSelectItem value="all">Все каналы</UiSelectItem>
                <UiSelectItem :value="AUDIT_CHANNEL.WEB">Веб</UiSelectItem>
                <UiSelectItem :value="AUDIT_CHANNEL.API">API</UiSelectItem>
                <UiSelectItem :value="AUDIT_CHANNEL.MCP">MCP</UiSelectItem>
                <UiSelectItem :value="AUDIT_CHANNEL.SYSTEM">Система</UiSelectItem>
              </UiSelectGroup>
            </UiSelectContent>
          </UiSelect>
        </UiField>
        <UiField>
          <UiFieldLabel for="audit-outcome">Результат</UiFieldLabel>
          <UiSelect v-model="outcome">
            <UiSelectTrigger id="audit-outcome"><UiSelectValue /></UiSelectTrigger>
            <UiSelectContent>
              <UiSelectGroup>
                <UiSelectItem value="all">Все результаты</UiSelectItem>
                <UiSelectItem :value="AUDIT_OUTCOME.SUCCEEDED">Успешно</UiSelectItem>
                <UiSelectItem :value="AUDIT_OUTCOME.FAILED">Ошибка</UiSelectItem>
              </UiSelectGroup>
            </UiSelectContent>
          </UiSelect>
        </UiField>
        <UiField>
          <UiFieldLabel for="audit-action">Точное действие</UiFieldLabel>
          <UiInput id="audit-action" v-model="action" maxlength="160" placeholder="document.updated" />
        </UiField>
        <UiField v-if="hasActiveFilters" class="w-max justify-end">
          <UiFieldLabel class="sr-only">Сбросить фильтры</UiFieldLabel>
          <UiButton type="button" variant="outline" :disabled="pending" @click="resetFilters">Сбросить фильтры</UiButton>
        </UiField>
    </UiFieldGroup>

    <UiAlert v-if="error" variant="destructive" role="alert">
      <UiAlertTitle>Не удалось загрузить журнал</UiAlertTitle>
      <UiAlertDescription>{{ error }}</UiAlertDescription>
    </UiAlert>

    <div v-if="pending && items.length === 0" class="flex flex-col gap-2">
      <UiSkeleton v-for="index in 6" :key="index" class="h-12 w-full" />
    </div>

    <UiEmpty v-else-if="items.length === 0">
      <UiEmptyHeader>
        <UiEmptyTitle>Событий не найдено</UiEmptyTitle>
        <UiEmptyDescription>Измените фильтры или повторите попытку позже.</UiEmptyDescription>
      </UiEmptyHeader>
    </UiEmpty>

    <DataGrid
      v-else
      grid-id="administration-audit"
      :columns="ADMINISTRATION_AUDIT_COLUMNS"
      :active-sort="sort"
      :direction="direction"
      @sort="setSort"
    >
      <template #body>
        <UiTableBody>
          <UiTableRow v-for="event in items" :key="event.id" class="h-14">
            <UiTableCell><span class="block truncate">{{ administrationAuditDateLabel(event.createdAt) }}</span></UiTableCell>
            <UiTableCell class="overflow-hidden">
              <div class="flex min-w-0 flex-col gap-1 overflow-hidden">
                <span class="truncate font-medium" :title="event.action">{{ event.action }}</span>
                <span v-if="event.details.length" class="truncate text-xs text-muted-foreground">
                  {{ event.details.map(detail => `${administrationAuditDetailLabel(detail.key)}: ${detail.value}`).join(' · ') }}
                </span>
              </div>
            </UiTableCell>
            <UiTableCell><span class="block truncate" :title="event.actor?.name ?? 'Система'">{{ event.actor?.name ?? 'Система' }}</span></UiTableCell>
            <UiTableCell><span class="block truncate" :title="event.project?.name ?? '—'">{{ event.project?.name ?? '—' }}</span></UiTableCell>
            <UiTableCell><UiBadge variant="secondary">{{ administrationAuditChannelLabel(event.channel) }}</UiBadge></UiTableCell>
            <UiTableCell>
              <UiBadge :variant="event.outcome === AUDIT_OUTCOME.FAILED ? 'destructive' : 'outline'">
                {{ administrationAuditOutcomeLabel(event.outcome) }}
              </UiBadge>
            </UiTableCell>
            <UiTableCell class="overflow-hidden text-muted-foreground">
              <span class="block truncate" :title="event.targetId ? `${event.targetType} · ${event.targetId}` : event.targetType">
                {{ event.targetType }}<template v-if="event.targetId"> ·
                  <UiButton variant="link" size="sm" class="h-auto max-w-full p-0 align-baseline" @click="selectedTargetEvent = event">
                    <span class="truncate">{{ event.targetId }}</span>
                  </UiButton>
                </template>
              </span>
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </template>
    </DataGrid>

    <div v-if="items.length" class="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p class="text-sm text-muted-foreground">
        Показано {{ items.length }} из {{ totalItems }} · Страница {{ page }} из {{ totalPages }}
      </p>
      <UiPagination
        v-if="totalPages > 1"
        :page="page"
        :total="totalItems"
        :items-per-page="ADMINISTRATION_AUDIT_PAGE_SIZE"
        :sibling-count="1"
        show-edges
        :disabled="pending"
        @update:page="load"
      >
        <UiPaginationContent v-slot="{ items: paginationItems }">
          <UiPaginationPrevious>Назад</UiPaginationPrevious>
          <template v-for="(paginationItem, index) in paginationItems" :key="index">
            <UiPaginationItem
              v-if="paginationItem.type === 'page'"
              :value="paginationItem.value"
              :is-active="paginationItem.value === page"
            >
              {{ paginationItem.value }}
            </UiPaginationItem>
            <UiPaginationEllipsis v-else :index="index" />
          </template>
          <UiPaginationNext>Далее</UiPaginationNext>
        </UiPaginationContent>
      </UiPagination>
    </div>

    <AdministrationAuditTargetDialog
      :open="selectedTargetEvent !== null"
      :audit-event-id="selectedTargetEvent?.id ?? null"
      :target-label="selectedTargetEvent ? `${selectedTargetEvent.targetType} · ${selectedTargetEvent.targetId}` : ''"
      @update:open="setTargetDialogOpen"
    />
  </div>
</template>
