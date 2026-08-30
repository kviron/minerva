<script setup lang="ts">
import type { AdministrationUsersResponse } from '../../../../shared/administration/contracts'
import {
  administrationUserAccessLabel,
  administrationUserDateLabel,
  administrationUserLastLoginLabel,
  administrationUserStatusLabel,
} from '../model/user-presentation'

defineProps<{ users: AdministrationUsersResponse }>()

const router = useRouter()
const openUser = (userId: string) => router.push(`/administration/users/${userId}`)
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <UiTable>
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>Пользователь</UiTableHead>
          <UiTableHead>Email</UiTableHead>
          <UiTableHead>Логин</UiTableHead>
          <UiTableHead>Статус</UiTableHead>
          <UiTableHead>Доступ</UiTableHead>
          <UiTableHead>Создан</UiTableHead>
          <UiTableHead>Последний вход</UiTableHead>
        </UiTableRow>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow
          v-for="user in users"
          :key="user.id"
          class="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          role="link"
          tabindex="0"
          :aria-label="`Открыть пользователя ${user.name}`"
          @click="openUser(user.id)"
          @keydown.enter.prevent="openUser(user.id)"
          @keydown.space.prevent="openUser(user.id)"
        >
          <UiTableCell class="font-medium">{{ user.name }}</UiTableCell>
          <UiTableCell class="text-muted-foreground">{{ user.email }}</UiTableCell>
          <UiTableCell>{{ user.username || '—' }}</UiTableCell>
          <UiTableCell>{{ administrationUserStatusLabel(user.status) }}</UiTableCell>
          <UiTableCell>{{ administrationUserAccessLabel(user.superAdmin) }}</UiTableCell>
          <UiTableCell>{{ administrationUserDateLabel(user.createdAt) }}</UiTableCell>
          <UiTableCell>{{ administrationUserLastLoginLabel(user.lastLoginAt) }}</UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>
  </div>
</template>
