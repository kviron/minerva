import type { AccountStatus } from '../identity/types'

export interface AdministrationUserListItem {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly username: string | null
  readonly status: AccountStatus
  readonly superAdmin: boolean
  readonly createdAt: string
  readonly lastLoginAt: string | null
}

export type AdministrationUsersResponse = readonly AdministrationUserListItem[]
export type AdministrationUserDetail = AdministrationUserListItem
