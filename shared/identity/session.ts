export interface IdentitySessionUserView {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly image?: string | null
  readonly superAdmin?: boolean
}

export interface IdentitySessionView {
  readonly user: IdentitySessionUserView
}

export interface IdentitySessionResult {
  readonly data: IdentitySessionView | null
  readonly error: unknown
}
