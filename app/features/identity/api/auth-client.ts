import { createAuthClient } from 'better-auth/vue'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { computed } from 'vue'
import type { Ref } from 'vue'
import type { createMinervaAuth } from '../../../../server/modules/identity/auth/create-auth'
import type {
  IdentitySessionResult,
  IdentitySessionView,
} from '../../../../shared/identity/session'

const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [inferAdditionalFields<ReturnType<typeof createMinervaAuth>>()],
})

export interface IdentitySessionState {
  readonly data: Ref<IdentitySessionView | null>
  readonly isPending: Ref<boolean>
  readonly error: Ref<unknown>
  readonly refetch: () => Promise<unknown> | unknown
}

export async function getIdentitySession(): Promise<IdentitySessionResult> {
  const result = await authClient.getSession()

  return {
    data: result.data,
    error: result.error,
  }
}

export function useIdentitySession(): IdentitySessionState {
  const session = authClient.useSession()

  return {
    data: computed(() => session.value.data),
    isPending: computed(() => session.value.isPending),
    error: computed(() => session.value.error),
    refetch: () => session.value.refetch(),
  }
}

export async function signOutIdentity(): Promise<{ readonly error: unknown }> {
  const result = await authClient.signOut()

  return { error: result.error }
}
