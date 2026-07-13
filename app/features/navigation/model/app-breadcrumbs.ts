export type AppBreadcrumbItem = Readonly<{
  label: string
  to?: string
}>

const STATIC_BREADCRUMBS: Readonly<Record<string, readonly AppBreadcrumbItem[]>> = {
  '/': [{ label: 'Главная' }],
  '/dashboard': [{ label: 'Главная' }],
  '/projects': [{ label: 'Проекты' }],
  '/settings': [{ label: 'Настройки' }],
  '/settings/profile': [{ label: 'Настройки', to: '/settings' }, { label: 'Профиль' }],
  '/settings/application': [{ label: 'Настройки', to: '/settings' }, { label: 'Приложение' }],
  '/settings/security': [{ label: 'Настройки', to: '/settings' }, { label: 'Безопасность' }],
  '/settings/connections': [{ label: 'Настройки', to: '/settings' }, { label: 'Подключения' }],
  '/administration': [{ label: 'Администрирование' }],
  '/administration/users': [{ label: 'Администрирование', to: '/administration' }, { label: 'Пользователи' }],
  '/administration/projects': [{ label: 'Администрирование', to: '/administration' }, { label: 'Проекты' }],
  '/administration/invitations': [{ label: 'Администрирование', to: '/administration' }, { label: 'Приглашения' }],
  '/administration/audit': [{ label: 'Администрирование', to: '/administration' }, { label: 'Журнал аудита' }],
  '/legal/privacy': [{ label: 'Правовая информация', to: '/legal/terms' }, { label: 'Политика конфиденциальности' }],
  '/legal/terms': [{ label: 'Правовая информация' }, { label: 'Условия использования' }],
}

const projectBreadcrumbs = (
  segments: readonly string[],
  projectName: string | null,
  documentName: string | null,
): readonly AppBreadcrumbItem[] => {
  const projectId = segments[1]
  if (!projectId) return [{ label: 'Проекты' }]

  const projectPath = `/projects/${projectId}`
  const projectLabel = projectName?.trim() || 'Проект'
  const projectRoot: readonly AppBreadcrumbItem[] = [
    { label: 'Проекты', to: '/projects' },
    { label: projectLabel },
  ]
  const section = segments[2]
  if (!section) return projectRoot

  const root: readonly AppBreadcrumbItem[] = [
    { label: 'Проекты', to: '/projects' },
    { label: projectLabel, to: projectPath },
  ]
  if (section === 'credentials') return [...root, { label: 'Учётные данные' }]
  if (section === 'kanban') return [...root, { label: 'Канбан' }]
  if (section === 'settings') return [...root, { label: 'Настройки' }]
  if (section !== 'documents') return [...root, { label: 'Раздел проекта' }]

  const documentsPath = `${projectPath}/documents`
  const documentId = segments[3]
  if (!documentId) return [...root, { label: 'Документация' }]

  const documentPath = `${documentsPath}/${documentId}`
  const documentLabel = documentName?.trim() || 'Документ'
  const documentAction = segments[4]
  if (!documentAction) {
    return [...root, { label: 'Документация', to: documentsPath }, { label: documentLabel }]
  }

  const actionLabel = documentAction === 'edit' ? 'Редактирование'
    : documentAction === 'history' ? 'История'
      : 'Раздел документа'
  return [
    ...root,
    { label: 'Документация', to: documentsPath },
    { label: documentLabel, to: documentPath },
    { label: actionLabel },
  ]
}

export const buildAppBreadcrumbs = (
  path: string,
  projectName: string | null,
  documentName: string | null = null,
): readonly AppBreadcrumbItem[] => {
  const normalizedPath = path.length > 1 ? path.replace(/\/+$/u, '') : path
  const staticItems = STATIC_BREADCRUMBS[normalizedPath]
  if (staticItems) return staticItems

  const segments = normalizedPath.split('/').filter(Boolean)
  if (segments[0] === 'projects') return projectBreadcrumbs(segments, projectName, documentName)
  if (segments[0] === 'administration' && segments[1] === 'users' && segments[2]) {
    return [
      { label: 'Администрирование', to: '/administration' },
      { label: 'Пользователи', to: '/administration/users' },
      { label: 'Пользователь' },
    ]
  }
  if (segments[0] === 'invitations') return [{ label: 'Приглашение' }]
  return [{ label: 'Страница' }]
}
