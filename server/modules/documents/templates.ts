import { DOCUMENT_TEMPLATE, type DocumentTemplate } from '../../../shared/documents/constants'
import type { DocumentContent, DocumentContentNode } from '../../../shared/documents/contracts'

const heading = (text: string, level = 2): DocumentContentNode => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
})

const emptyParagraph = (): DocumentContentNode => ({ type: 'paragraph' })

const sections = (titles: readonly string[]): DocumentContent => ({
  type: 'doc',
  content: titles.flatMap(title => [heading(title), emptyParagraph()]),
})

export const documentTemplateContent = (template: DocumentTemplate): DocumentContent => {
  switch (template) {
    case DOCUMENT_TEMPLATE.TECHNICAL_SPECIFICATION:
      return sections(['Цель', 'Контекст', 'Требования', 'Ограничения', 'Критерии приёмки'])
    case DOCUMENT_TEMPLATE.SITE_OVERVIEW:
      return sections(['Обзор', 'Архитектура', 'Окружения', 'Ключевые ссылки'])
    case DOCUMENT_TEMPLATE.SECTION_DESCRIPTION:
      return sections(['Назначение раздела', 'Содержание'])
    case DOCUMENT_TEMPLATE.TECHNICAL_NOTES:
      return sections(['Контекст', 'Наблюдения', 'Решение'])
    case DOCUMENT_TEMPLATE.OPERATING_INSTRUCTIONS:
      return sections(['Назначение', 'Предварительные условия', 'Порядок действий', 'Проверка', 'Откат'])
    case DOCUMENT_TEMPLATE.BLANK:
      return { type: 'doc', content: [] }
  }
}
