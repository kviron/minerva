import { MCP_SCOPE } from '../../../../shared/mcp/constants'

const SCOPE_LABELS: Readonly<Record<string, string>> = {
  [MCP_SCOPE.OFFLINE_ACCESS]: 'Долгосрочный доступ с возможностью обновления подключения',
  [MCP_SCOPE.PROJECTS_READ]: 'Просмотр списка проектов',
  [MCP_SCOPE.DOCUMENTS_READ]: 'Чтение документации',
  [MCP_SCOPE.DOCUMENTS_WRITE]: 'Создание и изменение черновиков',
  [MCP_SCOPE.DOCUMENTS_PUBLISH]: 'Публикация документации',
}

export const getOAuthScopeLabel = (scope: string): string => SCOPE_LABELS[scope] ?? scope
