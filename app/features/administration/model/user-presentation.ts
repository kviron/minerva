import type { AccountStatus } from '../../../../shared/identity/types'

const statusLabels = {
  active: 'Активен',
  disabled: 'Отключён',
} as const satisfies Record<AccountStatus, string>

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export const administrationUserStatusLabel = (status: AccountStatus) => statusLabels[status]
export const administrationUserAccessLabel = (superAdmin: boolean) =>
  superAdmin ? 'Суперадминистратор' : 'Пользователь'
export const administrationUserDateLabel = (value: string) => dateFormatter.format(new Date(value))
export const administrationUserLastLoginLabel = (value: string | null) =>
  value === null ? 'Никогда' : dateFormatter.format(new Date(value))
