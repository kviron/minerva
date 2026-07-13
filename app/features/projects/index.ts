export { default as ProjectsView } from './ui/ProjectsView.vue'
export { default as ProjectsProvider } from './ui/ProjectsProvider.vue'
export { default as CurrentProjectSidebar } from './ui/CurrentProjectSidebar.vue'
export { default as ProjectNavigation } from './ui/ProjectNavigation.vue'
export { default as ProjectOverview } from './ui/ProjectOverview.vue'
export { default as ProjectSectionPlaceholder } from './ui/ProjectSectionPlaceholder.vue'
export { default as ProjectShell } from './ui/ProjectShell.vue'
export { default as ProjectStatusTabs } from './ui/ProjectStatusTabs.vue'
export {
  filterProjectsByStatus,
  PROJECT_STATUS_FILTER,
  PROJECT_STATUS_FILTERS,
} from './model/project-status-filter'
export type { ProjectStatusFilter } from './model/project-status-filter'
export {
  availableProjectSections,
  PROJECT_SECTION,
  projectSectionPath,
} from './model/project-sections'
export type { ProjectSection } from './model/project-sections'
export { projectIdFromPath } from './model/current-project-route'
export { useProjectsStore } from './model/projects-state'
export { useProjectOverviewStore } from './model/project-overview-state'
