<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdministrationUsers } from '../model/use-administration-users'
import AdministrationUsersEmpty from './AdministrationUsersEmpty.vue'
import AdministrationUsersLoadError from './AdministrationUsersLoadError.vue'
import AdministrationUsersTable from './AdministrationUsersTable.vue'
import AdministrationUsersTableSkeleton from './AdministrationUsersTableSkeleton.vue'

const { users, pending, error, load } = useAdministrationUsers()

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 px-4 lg:px-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold">Пользователи</h1>
      <p class="text-sm text-muted-foreground">
        Все учётные записи приложения, их статус и уровень глобального доступа.
      </p>
    </div>

    <AdministrationUsersTableSkeleton v-if="pending" />
    <AdministrationUsersLoadError v-else-if="error" :message="error" @retry="load" />
    <AdministrationUsersEmpty v-else-if="users.length === 0" />
    <AdministrationUsersTable v-else :users="users" />
  </div>
</template>
