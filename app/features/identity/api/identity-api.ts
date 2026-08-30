import type {
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  SignInRequest,
} from '../../../../shared/identity/contracts'

export type SignInInput = SignInRequest
export type RequestPasswordResetInput = RequestPasswordResetRequest
export type ResetPasswordInput = ResetPasswordRequest

export interface RequestOptions {
  readonly method: 'POST'
  readonly body: Readonly<Record<string, string>>
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

const runtimeIdentityRequest: IdentityRequest = async (path, options) => {
  await $fetch(path, options)
}

export const identityApi = createIdentityApi(runtimeIdentityRequest)
