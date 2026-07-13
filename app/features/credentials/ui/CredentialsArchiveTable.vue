<script setup lang="ts">
import { Archive } from '@lucide/vue'
import type { ArchivedCredentialListItem } from '../../../../shared/credentials/contracts'

defineProps<{ rows: readonly ArchivedCredentialListItem[] }>()
const formatDate = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <h2 class="font-semibold">Архив учётных данных</h2>
      <p class="text-sm text-muted-foreground">Удалённые записи доступны только для просмотра без раскрытия секретных значений.</p>
    </div>

    <UiEmpty v-if="rows.length === 0" class="border border-dashed">
      <UiEmptyHeader>
        <UiEmptyMedia variant="icon"><Archive /></UiEmptyMedia>
        <UiEmptyTitle>Архив пуст</UiEmptyTitle>
        <UiEmptyDescription>Здесь появятся удалённые учётные данные.</UiEmptyDescription>
      </UiEmptyHeader>
    </UiEmpty>

    <div v-else class="overflow-hidden rounded-lg border">
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Название</UiTableHead>
            <UiTableHead>Категория</UiTableHead>
            <UiTableHead>Состав</UiTableHead>
            <UiTableHead>Удалено</UiTableHead>
            <UiTableHead>Кем удалено</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow v-for="row in rows" :key="row.id">
            <UiTableCell class="font-medium">{{ row.title }}</UiTableCell>
            <UiTableCell><UiBadge variant="secondary">{{ row.category.name }}</UiBadge></UiTableCell>
            <UiTableCell class="text-muted-foreground">
              <span>{{ row.hasLogin ? 'Логин' : 'Без логина' }}</span>
              <span> · {{ row.hasPassword ? 'Пароль' : 'Без пароля' }}</span>
              <span v-if="row.dynamicFieldCount"> · Полей: {{ row.dynamicFieldCount }}</span>
            </UiTableCell>
            <UiTableCell>{{ formatDate(row.archivedAt) }}</UiTableCell>
            <UiTableCell>{{ row.archivedBy.name }}</UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>
  </div>
</template>
