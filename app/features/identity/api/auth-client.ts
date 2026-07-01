import { createAuthClient } from 'better-auth/vue'
import type {
  IdentitySessionResult,
  IdentitySessionView,
} from '../../../../shared/identity/session'

const authClient = createAuthClient({ basePath: '/api/auth' })

export async function getIdentitySession(): Promise<IdentitySessionResult> {
  const result = await authClient.getSession()

  return {
    data: result.data as IdentitySessionView | null,
    error: result.error,
  }
}
