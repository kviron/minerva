<script setup lang="ts">
import { computed, watch } from 'vue'
import { ChevronsUpDown, FileKey, Files, Folder, LayoutDashboard, Settings } from '@lucide/vue'
import { useSidebar } from '@/components/ui/sidebar'
import { PROJECT_ACTION } from '../model/actions/actions'
import { useProjectsActions } from '../model/actions/provider'
import { PROJECTS_SCOPE } from '../model/actions/types'
import { projectIdFromPath } from '../model/current-project-route'
import { useProjectsStore } from '../model/projects-state'

const route = useRoute()
const { isMobile } = useSidebar()
const actions = useProjectsActions()
const state = useProjectsStore()
const selectedProjectId = computed(() => projectIdFromPath(route.path))
const projects = computed(() => state.projects)
const pending = computed(() => actions.isPendingFor(PROJECT_ACTION.LOAD, PROJECTS_SCOPE.MEMBER))
const selectedProject = computed(() =>
  state.projects.find(project => project.id === selectedProjectId.value) ?? null,
)
const projectNavigation = computed(() => selectedProjectId.value === null
  ? []
  : [
      { label: 'Обзор', to: `/projects/${selectedProjectId.value}`, icon: LayoutDashboard, exact: true },
      { label: 'Учётные данные', to: `/projects/${selectedProjectId.value}/credentials`, icon: FileKey, exact: false },
      { label: 'Документация', to: `/projects/${selectedProjectId.value}/documents`, icon: Files, exact: false },
      { label: 'Настройки', to: `/projects/${selectedProjectId.value}/settings`, icon: Settings, exact: false },
    ])

const load = async () => {
  const projects = await actions.load(PROJECTS_SCOPE.MEMBER)
  if (projects) {
    state.applyProjects(projects)
  }
}

watch(selectedProjectId, (projectId) => {
  if (projectId !== null) {
    void load()
  }
}, { immediate: true })
</script>

<template>
  <UiSidebarGroup class="group-data-[collapsible=icon]:hidden">
    <UiSidebarMenu>
      <UiSidebarMenuItem v-if="selectedProjectId !== null && pending">
        <UiSidebarMenuSkeleton show-icon />
      </UiSidebarMenuItem>

      <UiSidebarMenuItem v-else-if="selectedProject">
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiSidebarMenuButton size="lg" :is-active="true" tooltip="Выбрать проект">
              <Folder />
              <span>{{ selectedProject.name }}</span>
              <ChevronsUpDown class="ml-auto" />
            </UiSidebarMenuButton>
          </UiDropdownMenuTrigger>

          <UiDropdownMenuContent
            class="w-56 rounded-lg"
            :side="isMobile ? 'bottom' : 'right'"
            :align="isMobile ? 'end' : 'start'"
          >
            <UiDropdownMenuGroup>
              <UiDropdownMenuItem v-for="project in projects" :key="project.id" as-child>
                <NuxtLink :to="`/projects/${project.id}`">
                  <Folder />
                  <span>{{ project.name }}</span>
                </NuxtLink>
              </UiDropdownMenuItem>
            </UiDropdownMenuGroup>

            <UiDropdownMenuSeparator />

            <UiDropdownMenuGroup>
              <UiDropdownMenuItem as-child>
                <NuxtLink to="/projects">
                  <Folder />
                  <span>Все проекты</span>
                </NuxtLink>
              </UiDropdownMenuItem>
            </UiDropdownMenuGroup>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </UiSidebarMenuItem>

      <UiSidebarMenuItem v-else>
        <UiSidebarMenuButton as-child tooltip="Выберите проект">
          <NuxtLink to="/projects">
            <Folder />
            <span>Выберите проект</span>
          </NuxtLink>
        </UiSidebarMenuButton>
      </UiSidebarMenuItem>
    </UiSidebarMenu>
  </UiSidebarGroup>

  <UiSidebarGroup v-if="selectedProjectId !== null">
    <UiSidebarGroupContent>
      <UiSidebarMenu>
        <UiSidebarMenuItem v-for="item in projectNavigation" :key="item.to">
          <UiSidebarMenuButton as-child :is-active="item.exact ? route.path === item.to : route.path.startsWith(item.to)">
            <NuxtLink :to="item.to">
              <component :is="item.icon" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </UiSidebarMenuButton>
        </UiSidebarMenuItem>
      </UiSidebarMenu>
    </UiSidebarGroupContent>
  </UiSidebarGroup>
</template>
