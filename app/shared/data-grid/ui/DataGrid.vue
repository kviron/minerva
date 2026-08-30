<script setup lang="ts" generic="TSort extends string">
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, RotateCcwIcon } from '@lucide/vue'
import {
  createColumnHelper,
  functionalUpdate,
  getCoreRowModel,
  useVueTable,
  type ColumnDef,
  type ColumnSizingState,
  type Updater,
} from '@tanstack/vue-table'
import { computed, onMounted, ref, watch } from 'vue'
import { defaultDataGridColumnSizing, parseDataGridColumnSizing } from '../model/column-sizing'
import type { DataGridColumn } from '../model/types'

const props = defineProps<{
  gridId: string
  columns: readonly DataGridColumn<TSort>[]
  activeSort: TSort
  direction: 'asc' | 'desc'
}>()

const emit = defineEmits<{
  sort: [field: TSort]
}>()

defineSlots<{
  body: () => unknown
}>()

const storageKey = computed(() => `minerva:data-grid:${props.gridId}:columns:v1`)
const sizing = ref<ColumnSizingState>(defaultDataGridColumnSizing(props.columns))
const columnHelper = createColumnHelper<Record<string, never>>()
const tableColumns = computed<ColumnDef<Record<string, never>, unknown>[]>(() => props.columns.map(column => columnHelper.display({
  id: column.id,
  header: column.label,
  size: column.size,
  minSize: column.minSize,
  maxSize: column.maxSize,
})))

const setSizing = (updater: Updater<ColumnSizingState>): void => {
  sizing.value = functionalUpdate(updater, sizing.value)
}

const table = useVueTable({
  get data() { return [] },
  get columns() { return tableColumns.value },
  getCoreRowModel: getCoreRowModel(),
  columnResizeMode: 'onChange',
  enableColumnResizing: true,
  state: {
    get columnSizing() { return sizing.value },
  },
  onColumnSizingChange: setSizing,
})

const resetSizing = (): void => {
  sizing.value = defaultDataGridColumnSizing(props.columns)
}

const sortColumn = (index: number): void => {
  const field = props.columns[index]?.sort
  if (field !== undefined)
    emit('sort', field)
}

onMounted(() => {
  sizing.value = parseDataGridColumnSizing(props.columns, localStorage.getItem(storageKey.value))
})

watch(sizing, value => localStorage.setItem(storageKey.value, JSON.stringify(value)), { deep: true })
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <UiTable class="table-fixed" :style="{ width: `${table.getTotalSize()}px` }">
      <colgroup>
        <col
          v-for="column in table.getAllLeafColumns()"
          :key="column.id"
          :style="{ width: `${column.getSize()}px` }"
        >
      </colgroup>
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead
            v-for="(header, index) in table.getHeaderGroups()[0]?.headers ?? []"
            :key="header.id"
            class="relative overflow-hidden"
            :aria-sort="columns[index]?.sort === activeSort ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'"
          >
            <UiButton
              v-if="columns[index]?.sort"
              variant="ghost"
              size="sm"
              class="max-w-full"
              @click="sortColumn(index)"
            >
              <span class="truncate">{{ columns[index]?.label }}</span>
              <ArrowUpIcon v-if="columns[index]?.sort === activeSort && direction === 'asc'" data-icon="inline-end" />
              <ArrowDownIcon v-else-if="columns[index]?.sort === activeSort" data-icon="inline-end" />
              <ChevronsUpDownIcon v-else data-icon="inline-end" />
            </UiButton>
            <span v-else class="truncate">{{ columns[index]?.label }}</span>
            <button
              type="button"
              role="separator"
              aria-orientation="vertical"
              :aria-label="`Изменить ширину колонки «${columns[index]?.label}»`"
              class="absolute inset-y-0 right-0 w-2 cursor-col-resize touch-none select-none hover:bg-border"
              @mousedown="header.getResizeHandler()($event)"
              @touchstart="header.getResizeHandler()($event)"
              @dblclick="header.column.resetSize()"
            />
          </UiTableHead>
        </UiTableRow>
      </UiTableHeader>
      <slot name="body" />
    </UiTable>
    <div class="flex justify-end border-t p-1">
      <UiButton variant="ghost" size="sm" type="button" @click="resetSizing">
        <RotateCcwIcon data-icon="inline-start" />
        Сбросить ширину
      </UiButton>
    </div>
  </div>
</template>
