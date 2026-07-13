<script setup lang="ts">
import { watch } from 'vue'
import {
  administrationUserAccessLabel,
  administrationUserDateLabel,
  administrationUserLastLoginLabel,
  administrationUserStatusLabel,
} from '../model/user-presentation'
import { useAdministrationUser } from '../model/use-administration-user'

const props = defineProps<{ userId: string }>()
const { user, pending, error, load } = useAdministrationUser(() => props.userId)

watch(() => props.userId, load, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4 px-4 lg:px-6">
    <template v-if="pending">
      <UiSkeleton class="h-4 w-32" />
      <UiSkeleton class="h-8 w-64" />
      <UiSkeleton class="h-56 w-full" />
    </template>

    <UiEmpty v-else-if="error" class="border border-dashed" role="alert">
      <UiEmptyHeader>
        <UiEmptyTitle>Пользователь недоступен</UiEmptyTitle>
        <UiEmptyDescription>{{ error }}</UiEmptyDescription>
      </UiEmptyHeader>
      <UiEmptyContent>
        <UiButton variant="outline" size="sm" @click="load">Обновить</UiButton>
      </UiEmptyContent>
    </UiEmpty>

    <template v-else-if="user">
      <div class="flex flex-col gap-1">
        <NuxtLink to="/administration/users" class="text-sm text-muted-foreground hover:underline">
          Пользователи
        </NuxtLink>
        <h1 class="text-2xl font-semibold">{{ user.name }}</h1>
        <p class="text-sm text-muted-foreground">{{ user.email }}</p>
      </div>

      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Профиль пользователя</UiCardTitle>
          <UiCardDescription>Сведения об учётной записи и глобальном доступе.</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted-foreground">Email</dt>
              <dd class="font-medium">{{ user.email }}</dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted-foreground">Логин</dt>
              <dd class="font-medium">{{ user.username || '—' }}</dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted-foreground">Статус</dt>
              <dd class="font-medium">{{ administrationUserStatusLabel(user.status) }}</dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted-foreground">Доступ</dt>
              <dd class="font-medium">{{ administrationUserAccessLabel(user.superAdmin) }}</dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted-foreground">Создан</dt>
              <dd class="font-medium">{{ administrationUserDateLabel(user.createdAt) }}</dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-sm text-muted-foreground">Последний вход</dt>
              <dd class="font-medium">{{ administrationUserLastLoginLabel(user.lastLoginAt) }}</dd>
            </div>
          </dl>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
