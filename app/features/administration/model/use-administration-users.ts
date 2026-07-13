import { readonly, ref } from 'vue'
import type { AdministrationUsersResponse } from '../../../../shared/administration/users'
import { administrationUsersApi } from '../api/users-api'

export function useAdministrationUsers() {
  const users = ref<AdministrationUsersResponse>([])
  const pending = ref(true)
  const error = ref('')

  const load = async () => {
    pending.value = true
    error.value = ''
    try {
      users.value = await administrationUsersApi.list()
    }
    catch {
      error.value = 'Не удалось загрузить пользователей.'
    }
    finally {
      pending.value = false
    }
  }

  return {
    users: readonly(users),
    pending: readonly(pending),
    error: readonly(error),
    load,
  }
}
