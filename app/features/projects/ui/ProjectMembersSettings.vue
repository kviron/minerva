<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PROJECT_ROLE_KEY } from '../../../../shared/projects/constants'
import type { ProjectMember } from '../../../../shared/projects/contracts'
import { PROJECT_ACTION, ProjectsActions } from '../model/actions/actions'

const props = defineProps<{ projectId: string }>()
const actions = new ProjectsActions()
const members = ref<readonly ProjectMember[]>([])
const loading = computed(() => actions.isPendingFor(PROJECT_ACTION.LOAD_MEMBERS, props.projectId))

const roleLabel = (member: ProjectMember): string => {
  if (member.role.customName !== null) return member.role.customName
  if (member.role.builtInKey === PROJECT_ROLE_KEY.ADMIN) return 'Администратор'
  if (member.role.builtInKey === PROJECT_ROLE_KEY.EDITOR) return 'Редактор'
  return 'Наблюдатель'
}

const load = async (): Promise<void> => {
  const result = await actions.loadMembers(props.projectId)
  if (result) members.value = result
}

watch(() => props.projectId, load, { immediate: true })
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Участники проекта</UiCardTitle>
      <UiCardDescription>Текущие участники и назначенные им роли.</UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <UiSkeleton v-if="loading" class="h-48 w-full" />
      <UiAlert v-else-if="actions.error.value" variant="destructive">
        <UiAlertTitle>Не удалось загрузить участников</UiAlertTitle>
        <UiAlertDescription>{{ actions.error.value }}</UiAlertDescription>
      </UiAlert>
      <UiEmpty v-else-if="members.length === 0" class="border border-dashed">
        <UiEmptyHeader>
          <UiEmptyTitle>Участников пока нет</UiEmptyTitle>
          <UiEmptyDescription>Приглашённые пользователи появятся в этой таблице.</UiEmptyDescription>
        </UiEmptyHeader>
      </UiEmpty>
      <UiTable v-else>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Участник</UiTableHead>
            <UiTableHead>Роль</UiTableHead>
            <UiTableHead>Присоединился</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow v-for="member in members" :key="member.id">
            <UiTableCell>
              <div class="flex flex-col gap-1">
                <span class="font-medium">{{ member.name }}</span>
                <span class="text-sm text-muted-foreground">{{ member.email }}</span>
              </div>
            </UiTableCell>
            <UiTableCell><UiBadge variant="secondary">{{ roleLabel(member) }}</UiBadge></UiTableCell>
            <UiTableCell>{{ new Date(member.joinedAt).toLocaleDateString('ru-RU') }}</UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </UiCardContent>
  </UiCard>
</template>
