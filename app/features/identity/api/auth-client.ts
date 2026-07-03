import { createAuthClient } from 'better-auth/vue'
import { computed } from 'vue'
import type { Ref } from 'vue'
import type {
  IdentitySessionResult,
  IdentitySessionView,
} from '../../../../shared/identity/session'

const authClient = createAuthClient({ basePath: '/api/auth' })

export interface IdentitySessionState {
  readonly data: Ref<IdentitySessionView | null>
  readonly isPending: Ref<boolean>
  readonly error: Ref<unknown>
  readonly refetch: () => Promise<unknown> | unknown
}

export async function getIdentitySession(): Promise<IdentitySessionResult> {
  const result = await authClient.getSession()

  return {
    data: result.data as IdentitySessionView | null,
    error: result.error,
  }
}

export function useIdentitySession(): IdentitySessionState {
  const session = authClient.useSession()

  return {
    data: computed(() => session.value.data as IdentitySessionView | null),
    isPending: computed(() => session.value.isPending),
    error: computed(() => session.value.error),
    refetch: () => session.value.refetch(),
  }
}

export async function signOutIdentity(): Promise<{ readonly error: unknown }> {
  const result = await authClient.signOut()

  return { error: result.error }
}
