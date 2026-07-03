<script setup lang="ts">
import { computed, ref } from 'vue'
import NavUser from '@/components/nav/user/index.vue'
import { Button } from '@/components/ui/button'
import { SidebarMenuSkeleton } from '@/components/ui/sidebar'
import { signOutIdentity, useIdentitySession } from '../api/auth-client'
import { toCurrentUserView } from '../model/current-user'

const session = useIdentitySession()
const logoutPending = ref(false)
const logoutError = ref<string>()

const currentUser = computed(() => session.data.value
  ? toCurrentUserView(session.data.value.user)
  : null)

const openProfile = () => navigateTo('/settings/profile')

async function logout() {
  if (logoutPending.value)
    return

  logoutPending.value = true
  logoutError.value = undefined

  try {
    const result = await signOutIdentity()

    if (result.error) {
      logoutError.value = 'Не удалось выйти. Повторите попытку.'
      return
    }

    await navigateTo('/auth')
  }
  catch {
    logoutError.value = 'Не удалось выйти. Повторите попытку.'
  }
  finally {
    logoutPending.value = false
  }
}
</script>

<template>
  <SidebarMenuSkeleton v-if="session.isPending.value" show-icon />
  <div
    v-else-if="session.error.value"
    role="alert"
    class="space-y-2 px-2 text-xs text-destructive"
  >
    <p>Не удалось загрузить пользователя.</p>
    <Button variant="outline" size="sm" @click="session.refetch">
      Повторить
    </Button>
  </div>
  <NavUser
    v-else-if="currentUser"
    :user="currentUser"
    :logout-pending="logoutPending"
    :logout-error="logoutError"
    @profile="openProfile"
    @logout="logout"
  />
</template>
