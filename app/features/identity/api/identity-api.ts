export interface SignInInput {
  readonly identifier: string
  readonly password: string
}

export interface RequestPasswordResetInput {
  readonly email: string
}

export interface ResetPasswordInput {
  readonly token: string
  readonly newPassword: string
}

export interface RequestOptions {
  readonly method: 'POST'
  readonly body: Record<string, string>
}

export type IdentityRequest = (
  path: string,
  options: RequestOptions,
) => Promise<unknown>

export const createIdentityApi = (request: IdentityRequest) => ({
  async signIn(input: SignInInput): Promise<void> {
    await request('/api/identity/sign-in', {
      method: 'POST',
      body: { ...input },
    })
  },
  async requestPasswordReset(input: RequestPasswordResetInput): Promise<void> {
    await request('/api/identity/request-password-reset', {
      method: 'POST',
      body: { ...input },
    })
  },
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await request('/api/identity/reset-password', {
      method: 'POST',
      body: { ...input },
    })
  },
})

export const identityApi = createIdentityApi(
  (path, options) => ($fetch as IdentityRequest)(path, options),
)
