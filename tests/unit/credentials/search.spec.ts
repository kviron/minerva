import { describe, expect, it } from 'vitest'
import { matchesCredentialSearch, normalizeCredentialSearchQuery } from '../../../server/modules/credentials/search'

const credential = {
  title: 'Панель управления',
  login: 'Admin@Example.com',
  fields: [
    { label: 'Адрес хостинга', value: 'https://hosting.example.com' },
    { label: 'Комментарий', value: 'Основной сервер' },
  ],
}

describe('credential search', () => {
  it('normalizes surrounding whitespace and Russian case', () => {
    expect(normalizeCredentialSearchQuery('  СЕРВЕР  ')).toBe('сервер')
  })

  it.each([
    ['названию', 'управления'],
    ['логину', 'admin@example'],
    ['названию дополнительного поля', 'хостинга'],
    ['значению дополнительного поля', 'основной сервер'],
  ])('matches by %s', (_source, query) => {
    expect(matchesCredentialSearch(normalizeCredentialSearchQuery(query), credential)).toBe(true)
  })

  it('does not match an unrelated value', () => {
    expect(matchesCredentialSearch(normalizeCredentialSearchQuery('staging'), credential)).toBe(false)
  })
})
