import { describe, expect, it } from 'vitest'
import type { IdentitySessionUserView } from '../../../../shared/identity/session'
import { toCurrentUserView } from '../../../../app/features/identity/model/current-user'

const user = (
  overrides: Partial<IdentitySessionUserView> = {},
): IdentitySessionUserView => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides,
})

describe('toCurrentUserView', () => {
  it('trims display fields and creates initials from two Cyrillic words', () => {
    expect(toCurrentUserView(user({
      name: '  анна   петрова  ',
      email: '  anna@example.com  ',
    }))).toEqual({
      name: 'анна   петрова',
      email: 'anna@example.com',
      initials: 'АП',
    })
  })

  it('uses the first Unicode code point of a single-word name', () => {
    expect(toCurrentUserView(user({ name: '  élodie  ' })).initials).toBe('É')
  })

  it('caps initials at the first two words of a longer name', () => {
    expect(toCurrentUserView(user({ name: 'Анна Мария Петрова' })).initials).toBe('АМ')
  })

  it('falls back to the first trimmed email character when the name is empty', () => {
    expect(toCurrentUserView(user({
      name: '   ',
      email: '  юлия@example.com ',
    })).initials).toBe('Ю')
  })

  it('uses empty initials when both name and email are empty', () => {
    expect(toCurrentUserView(user({ name: ' ', email: '   ' })).initials).toBe('')
  })

  it.each([
    [' /avatars/me.png ', '/avatars/me.png'],
    [' http://images.example.com/me.png ', 'http://images.example.com/me.png'],
    ['https://images.example.com/me.png', 'https://images.example.com/me.png'],
  ])('accepts and trims safe avatar %s', (image, avatar) => {
    expect(toCurrentUserView(user({ image })).avatar).toBe(avatar)
  })

  it.each([
    null,
    undefined,
    '',
    '   ',
    'javascript:alert(1)',
    '//evil.example/avatar.png',
    '/\\evil.example/avatar.png',
    '/avatars\\me.png',
    'avatars/me.png',
    'http://',
    'https://exa mple.com/avatar.png',
    'ftp://example.com/avatar.png',
  ])('rejects unsafe or malformed avatar %s', (image) => {
    expect(toCurrentUserView(user({ image }))).not.toHaveProperty('avatar')
  })
})
