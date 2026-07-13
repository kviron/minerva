<script setup lang="ts">
import { FolderKey, Plus, Settings2 } from '@lucide/vue'
import type { CredentialCategory } from '../../../../shared/credentials/category-contracts'

defineProps<{
  categories: readonly CredentialCategory[]
  canCreate: boolean
  canManage: boolean
}>()

const emit = defineEmits<{ create: [], edit: [categoryId: string] }>()
const accessSummary = (category: CredentialCategory) => {
  const count = category.roleIds.length + category.membershipIds.length
  return count === 0 ? 'Нет назначений' : `Назначений: ${count}`
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-semibold">Категории учётных данных</h2>
        <p class="text-sm text-muted-foreground">Группируйте записи и настраивайте доступ участников проекта.</p>
      </div>
      <UiButton v-if="canCreate" @click="emit('create')"><Plus data-icon="inline-start" />Новая категория</UiButton>
    </div>

    <UiEmpty v-if="categories.length === 0" class="border border-dashed">
      <UiEmptyHeader>
        <UiEmptyMedia variant="icon"><FolderKey /></UiEmptyMedia>
        <UiEmptyTitle>Категорий пока нет</UiEmptyTitle>
        <UiEmptyDescription>Создайте категорию, чтобы добавлять учётные данные.</UiEmptyDescription>
      </UiEmptyHeader>
      <UiEmptyContent v-if="canCreate"><UiButton @click="emit('create')"><Plus data-icon="inline-start" />Создать категорию</UiButton></UiEmptyContent>
    </UiEmpty>

    <div v-else class="overflow-hidden rounded-lg border">
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Название</UiTableHead>
            <UiTableHead>Описание</UiTableHead>
            <UiTableHead>Доступ</UiTableHead>
            <UiTableHead v-if="canManage"><span class="sr-only">Действия</span></UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow v-for="category in categories" :key="category.id">
            <UiTableCell class="font-medium">{{ category.name }}</UiTableCell>
            <UiTableCell class="max-w-md text-muted-foreground">{{ category.description || '—' }}</UiTableCell>
            <UiTableCell>{{ accessSummary(category) }}</UiTableCell>
            <UiTableCell v-if="canManage" class="w-10">
              <UiButton variant="ghost" size="icon" :aria-label="`Настроить категорию: ${category.name}`" @click="emit('edit', category.id)"><Settings2 /></UiButton>
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>
  </div>
</template>
