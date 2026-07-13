<script setup lang="ts">
import { FolderOpen } from '@lucide/vue'
import type { ProjectOverviewProjection } from '../../../../shared/projects/contracts'
import { projectRoleLabel, projectStatusLabel } from '../model/presentation'

defineProps<{ project: ProjectOverviewProjection }>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold">{{ project.name }}</h1>

    <UiCard>
      <UiCardHeader>
        <UiCardTitle>О проекте</UiCardTitle>
        <UiCardDescription>{{ project.description || 'Описание проекта пока не добавлено.' }}</UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <dl class="grid gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted-foreground">Участники</dt>
            <dd class="font-medium">{{ project.activeMemberCount }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted-foreground">Ваша роль</dt>
            <dd class="font-medium">{{ projectRoleLabel(project.role) }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted-foreground">Статус</dt>
            <dd class="font-medium">{{ projectStatusLabel(project.status) }}</dd>
          </div>
        </dl>
      </UiCardContent>
    </UiCard>

    <UiEmpty class="border border-dashed">
      <UiEmptyHeader>
        <UiEmptyMedia variant="icon">
          <FolderOpen />
        </UiEmptyMedia>
        <UiEmptyTitle>Страницы проекта</UiEmptyTitle>
        <UiEmptyDescription>
          Здесь появятся корневые страницы и документация проекта.
        </UiEmptyDescription>
      </UiEmptyHeader>
      <UiEmptyContent>
        <UiButton variant="outline" size="sm" as-child>
          <NuxtLink :to="`/projects/${project.id}/documents`">Открыть страницы</NuxtLink>
        </UiButton>
      </UiEmptyContent>
    </UiEmpty>
  </div>
</template>
