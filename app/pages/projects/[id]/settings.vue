<script setup lang="ts">
import { computed, ref } from 'vue'
import { ProjectAiConnectionSettings } from '@/features/ai-assistant'
import { ProjectGeneralSettings, ProjectMembersSettings, ProjectShell } from '@/features/projects'
import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'

const route = useRoute()
const projectId = computed(() => String(route.params.id))

const PROJECT_SETTINGS_TAB = {
  GENERAL: 'general',
  AI_ASSISTANT: 'ai-assistant',
  MEMBERS: 'members',
} as const

type ProjectSettingsTab = typeof PROJECT_SETTINGS_TAB[keyof typeof PROJECT_SETTINGS_TAB]

const activeTab = ref<ProjectSettingsTab>(
  route.query.tab === PROJECT_SETTINGS_TAB.AI_ASSISTANT
    ? PROJECT_SETTINGS_TAB.AI_ASSISTANT
    : PROJECT_SETTINGS_TAB.GENERAL,
)
</script>

<template>
  <ProjectShell :project-id="projectId" active="settings">
    <template #default="{ project }">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold">Настройки проекта</h1>
          <p class="text-sm text-muted-foreground">Управление защищёнными возможностями проекта.</p>
        </div>
        <UiTabs v-model="activeTab" class="flex flex-col gap-4">
          <UiTabsList>
            <UiTabsTrigger :value="PROJECT_SETTINGS_TAB.GENERAL">Основные</UiTabsTrigger>
            <UiTabsTrigger
              v-if="project.permissions.includes(PROJECT_PERMISSION.PROJECT_AI_MANAGE)"
              :value="PROJECT_SETTINGS_TAB.AI_ASSISTANT"
            >AI-помощник</UiTabsTrigger>
            <UiTabsTrigger
              v-if="project.permissions.includes(PROJECT_PERMISSION.MEMBERS_VIEW)"
              :value="PROJECT_SETTINGS_TAB.MEMBERS"
            >Участники</UiTabsTrigger>
          </UiTabsList>

          <UiTabsContent :value="PROJECT_SETTINGS_TAB.GENERAL" class="mt-0 flex flex-col gap-4">
            <ProjectGeneralSettings
              :project-id="projectId"
              :project-name="project.name"
              :description-content="project.descriptionContent"
              :icon-id="project.iconId"
            />
          </UiTabsContent>

          <UiTabsContent
            v-if="project.permissions.includes(PROJECT_PERMISSION.PROJECT_AI_MANAGE)"
            :value="PROJECT_SETTINGS_TAB.AI_ASSISTANT"
            class="mt-0"
          >
            <ProjectAiConnectionSettings :project-id="projectId" />
          </UiTabsContent>

          <UiTabsContent
            v-if="project.permissions.includes(PROJECT_PERMISSION.MEMBERS_VIEW)"
            :value="PROJECT_SETTINGS_TAB.MEMBERS"
            class="mt-0"
          >
            <ProjectMembersSettings :project-id="projectId" />
          </UiTabsContent>
        </UiTabs>
      </div>
    </template>
  </ProjectShell>
</template>
