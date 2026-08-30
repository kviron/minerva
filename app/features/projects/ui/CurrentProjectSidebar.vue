<script setup lang="ts">
import { computed, watch } from 'vue'
import { ChevronsUpDown, FileKey, Files, Folder, LayoutDashboard, Settings } from '@lucide/vue'
import { useSidebar } from '@/components/ui/sidebar'
import { PROJECT_ACTION } from '../model/actions/actions'
import { useProjectsActions } from '../model/actions/provider'
import { PROJECTS_SCOPE } from '../model/actions/types'
import { projectIdFromPath } from '../model/current-project-route'
import { projectIconUrl, projectInitials } from '../model/project-icon'
import { useProjectsStore } from '../model/projects-state'

const route = useRoute()
const { isMobile } = useSidebar()
const actions = useProjectsActions()
const state = useProjectsStore()
const selectedProjectId = computed(() => projectIdFromPath(route.path))
const projects = computed(() => state.list.scope === 'member' ? state.list.projects : [])
const nextCursor = computed(() => state.list.scope === 'member' ? state.list.nextCursor : null)
const pending = computed(() => actions.isPendingFor(PROJECT_ACTION.LOAD, PROJECTS_SCOPE.MEMBER))
const initialPending = computed(() => pending.value && projects.value.length === 0)
const selectedProject = computed(() =>
  projects.value.find(project => project.id === selectedProjectId.value) ?? null,
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
  const result = await actions.load(PROJECTS_SCOPE.MEMBER)
  if (result?.scope === PROJECTS_SCOPE.MEMBER) {
    state.applyMemberProjects(result.projects, result.nextCursor)
  }
}

const loadMore = async () => {
  if (nextCursor.value === null) return
  const result = await actions.load(PROJECTS_SCOPE.MEMBER, nextCursor.value)
  if (result?.scope === PROJECTS_SCOPE.MEMBER) {
    state.appendMemberProjects(result.projects, result.nextCursor)
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
      <UiSidebarMenuItem v-if="selectedProjectId !== null && initialPending">
        <UiSidebarMenuSkeleton show-icon />
      </UiSidebarMenuItem>

      <UiSidebarMenuItem v-else-if="selectedProject">
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiSidebarMenuButton size="lg" :is-active="true" tooltip="Выбрать проект">
              <UiAvatar class="size-8 rounded-lg">
                <UiAvatarImage
                  v-if="selectedProject.iconId"
                  :src="projectIconUrl(selectedProject.id, selectedProject.iconId)"
                  :alt="`Иконка проекта ${selectedProject.name}`"
                />
                <UiAvatarFallback class="rounded-lg">{{ projectInitials(selectedProject.name) }}</UiAvatarFallback>
              </UiAvatar>
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
                  <UiAvatar class="size-6 rounded-md">
                    <UiAvatarImage
                      v-if="project.iconId"
                      :src="projectIconUrl(project.id, project.iconId)"
                      :alt="`Иконка проекта ${project.name}`"
                    />
                    <UiAvatarFallback class="rounded-md">{{ projectInitials(project.name) }}</UiAvatarFallback>
                  </UiAvatar>
                  <span>{{ project.name }}</span>
                </NuxtLink>
              </UiDropdownMenuItem>
              <UiDropdownMenuItem v-if="nextCursor" :disabled="pending" @select.prevent="loadMore">
                <span>Показать ещё</span>
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
