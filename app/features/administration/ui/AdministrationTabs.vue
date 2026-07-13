<script setup lang="ts">
defineProps<{ active: 'users' | 'invitations' | 'projects' | 'audit' }>()

const tabs = [
  { value: 'users', label: 'Пользователи', to: '/administration/users' },
  { value: 'invitations', label: 'Приглашения', to: '/administration/invitations' },
  { value: 'projects', label: 'Проекты', to: '/administration/projects' },
  { value: 'audit', label: 'Аудит', to: '/administration/audit' },
] as const
</script>

<template>
  <UiTabs :model-value="active">
    <div class="max-w-full overflow-x-auto overflow-y-hidden">
      <UiTabsList>
        <UiTabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" as-child>
          <NuxtLink :to="tab.to">
            {{ tab.label }}
          </NuxtLink>
        </UiTabsTrigger>
      </UiTabsList>
    </div>
  </UiTabs>
</template>
