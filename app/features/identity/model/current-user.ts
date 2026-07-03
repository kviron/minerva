import type { IdentitySessionUserView } from '../../../../shared/identity/session'

export interface CurrentUserView {
  readonly name: string
  readonly email: string
  readonly initials: string
  readonly avatar?: string
}

const firstCodePoint = (value: string): string => Array.from(value)[0] ?? ''

const toInitials = (name: string, email: string): string => {
  const words = name.split(/\s+/u).filter(Boolean).slice(0, 2)

  if (words.length > 0) {
    return words
      .map(word => firstCodePoint(word).toLocaleUpperCase('ru-RU'))
      .join('')
  }

  return firstCodePoint(email).toLocaleUpperCase('ru-RU')
}

const toAvatar = (image: string | null | undefined): string | undefined => {
  const avatar = image?.trim()

  if (!avatar) {
    return undefined
  }

  if (avatar.startsWith('/') && !avatar.startsWith('//')) {
    return avatar
  }

  try {
    const url = new URL(avatar)
    return url.protocol === 'http:' || url.protocol === 'https:' ? avatar : undefined
  }
  catch {
    return undefined
  }
}

export const toCurrentUserView = (user: IdentitySessionUserView): CurrentUserView => {
  const name = user.name.trim()
  const email = user.email.trim()
  const avatar = toAvatar(user.image)

  return {
    name,
    email,
    initials: toInitials(name, email),
    ...(avatar ? { avatar } : {}),
  }
}
