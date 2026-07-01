export interface IdentitySessionView {
  readonly user: {
    readonly superAdmin?: boolean
  }
}

export interface IdentitySessionResult {
  readonly data: IdentitySessionView | null
  readonly error: unknown
}
