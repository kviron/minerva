import { readonly, ref } from 'vue'
import type { AdministrationUserDetail } from '../../../../shared/administration/contracts'
import { administrationUsersApi } from '../api/users-api'

export function useAdministrationUser(userId: () => string) {
  const user = ref<AdministrationUserDetail | null>(null)
  const pending = ref(true)
  const error = ref('')

  const load = async () => {
    pending.value = true
    error.value = ''
    user.value = null
    try {
      user.value = await administrationUsersApi.get(userId())
    }
    catch {
      error.value = 'Пользователь недоступен или не найден.'
    }
    finally {
      pending.value = false
    }
  }

  return { user: readonly(user), pending: readonly(pending), error: readonly(error), load }
}
