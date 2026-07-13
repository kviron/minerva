export const DOCUMENT_PUBLICATION_STATE = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const

export type DocumentPublicationState = typeof DOCUMENT_PUBLICATION_STATE[keyof typeof DOCUMENT_PUBLICATION_STATE]

export const DOCUMENT_TEMPLATE = {
  BLANK: 'blank',
  TECHNICAL_SPECIFICATION: 'technical_specification',
  SITE_OVERVIEW: 'site_overview',
  SECTION_DESCRIPTION: 'section_description',
  TECHNICAL_NOTES: 'technical_notes',
  OPERATING_INSTRUCTIONS: 'operating_instructions',
} as const

export type DocumentTemplate = typeof DOCUMENT_TEMPLATE[keyof typeof DOCUMENT_TEMPLATE]

export const DOCUMENT_DRAFT_UPDATE_CODE = {
  DRAFT_CONFLICT: 'DRAFT_CONFLICT',
} as const

export type DocumentDraftUpdateCode = typeof DOCUMENT_DRAFT_UPDATE_CODE[keyof typeof DOCUMENT_DRAFT_UPDATE_CODE]

export const SYSTEM_DOCUMENT_TEMPLATES: readonly Readonly<{
  value: DocumentTemplate
  label: string
  description: string
}>[] = [
  { value: DOCUMENT_TEMPLATE.BLANK, label: 'Пустая страница', description: 'Начните с чистого документа.' },
  { value: DOCUMENT_TEMPLATE.TECHNICAL_SPECIFICATION, label: 'Техническое задание', description: 'Цели, требования, ограничения и критерии приёмки.' },
  { value: DOCUMENT_TEMPLATE.SITE_OVERVIEW, label: 'Обзор сайта', description: 'Архитектура, окружения и ключевые ссылки.' },
  { value: DOCUMENT_TEMPLATE.SECTION_DESCRIPTION, label: 'Описание раздела', description: 'Назначение раздела и его содержимое.' },
  { value: DOCUMENT_TEMPLATE.TECHNICAL_NOTES, label: 'Технические заметки', description: 'Контекст, наблюдения и принятое решение.' },
  { value: DOCUMENT_TEMPLATE.OPERATING_INSTRUCTIONS, label: 'Инструкция по эксплуатации', description: 'Подготовка, порядок действий, проверка и откат.' },
]
