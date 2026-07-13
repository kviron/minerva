<script setup lang="ts">
import { Check, Copy, Eye, EyeOff, MoreVertical, Pencil, Trash2 } from '@lucide/vue'
import type { MaskedCredentialListItem } from '../../../../shared/credentials/contracts'
import { CREDENTIAL_ACTION } from '../model/actions/actions'
import { useCredentialsActions } from '../model/actions/provider'
import { useCredentialsStore } from '../model/credentials-state'

defineProps<{ rows: readonly MaskedCredentialListItem[] }>()
const emit = defineEmits<{ edit: [row: MaskedCredentialListItem], delete: [row: MaskedCredentialListItem] }>()
const actions = useCredentialsActions()
const state = useCredentialsStore()
const showPassword = async (credentialId: string) => {
  if (state.revealedPasswords[credentialId] !== undefined) {
    return state.clearRevealedPassword(credentialId)
  }
  const value = await actions.revealPassword(credentialId)
  if (value !== undefined) {
    state.setRevealedPassword(credentialId, value)
  }
}
const markCopied = (key: string) => {
  state.setCopiedKey(key)
  window.setTimeout(() => {
    if (state.copiedKey === key) {
      state.setCopiedKey(null)
    }
  }, 1500)
}
const copyLogin = async (credentialId: string, login: string) => {
  const key = await actions.copyLogin(credentialId, login)
  if (key) {
    markCopied(key)
  }
}
const copyPassword = async (credentialId: string) => {
  const key = await actions.copyPassword(credentialId, state.revealedPasswords[credentialId])
  if (key) {
    markCopied(key)
  }
}
const formatDate = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const initials = (name: string) => name.split(/\s+/u).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]?.toLocaleUpperCase('ru-RU') ?? '').join('')
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <UiTable>
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>Название</UiTableHead>
          <UiTableHead>Категория</UiTableHead>
          <UiTableHead>Логин</UiTableHead>
          <UiTableHead>Пароль</UiTableHead>
          <UiTableHead>Изменено</UiTableHead>
          <UiTableHead><span class="sr-only">Действия</span></UiTableHead>
        </UiTableRow>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow v-for="row in rows" :key="row.id">
          <UiTableCell class="font-medium">{{ row.title }}</UiTableCell>
          <UiTableCell><UiBadge variant="secondary">{{ row.category.name }}</UiBadge></UiTableCell>
          <UiTableCell>
            <div class="flex items-center gap-1">
              <span class="font-mono">{{ row.login ?? '—' }}</span>
              <UiButton v-if="row.login" type="button" variant="ghost" size="icon-sm" :disabled="actions.isPendingFor(CREDENTIAL_ACTION.COPY_LOGIN, row.id)" :aria-label="`Копировать логин: ${row.title}`" @click="copyLogin(row.id, row.login)">
                <Check v-if="state.copiedKey === `login:${row.id}`" /><Copy v-else />
              </UiButton>
            </div>
          </UiTableCell>
          <UiTableCell>
            <div v-if="row.hasPassword" class="flex items-center gap-1">
              <span class="font-mono">{{ state.revealedPasswords[row.id] ?? '••••••••' }}</span>
              <UiButton type="button" variant="ghost" size="icon-sm" :disabled="actions.isPendingFor(CREDENTIAL_ACTION.REVEAL_PASSWORD, row.id)" :aria-label="state.revealedPasswords[row.id] === undefined ? `Показать пароль: ${row.title}` : `Скрыть пароль: ${row.title}`" @click="showPassword(row.id)">
                <Eye v-if="state.revealedPasswords[row.id] === undefined" /><EyeOff v-else />
              </UiButton>
              <UiButton type="button" variant="ghost" size="icon-sm" :disabled="actions.isPendingFor(CREDENTIAL_ACTION.COPY_PASSWORD, row.id)" :aria-label="`Копировать пароль: ${row.title}`" @click="copyPassword(row.id)">
                <Check v-if="state.copiedKey === `password:${row.id}`" /><Copy v-else />
              </UiButton>
            </div>
            <span v-else>—</span>
          </UiTableCell>
          <UiTableCell>
            <UiHoverCard>
              <UiHoverCardTrigger as-child>
                <span class="cursor-help text-muted-foreground" tabindex="0">{{ formatDate(row.updatedAt) }}</span>
              </UiHoverCardTrigger>
              <UiHoverCardContent class="w-72">
                <div class="flex items-center gap-3">
                  <UiAvatar>
                    <UiAvatarImage v-if="row.updatedBy.avatar" :src="row.updatedBy.avatar" :alt="row.updatedBy.name" />
                    <UiAvatarFallback>{{ initials(row.updatedBy.name) }}</UiAvatarFallback>
                  </UiAvatar>
                  <div class="flex min-w-0 flex-col gap-1">
                    <span class="truncate text-base font-semibold">{{ row.updatedBy.name }}</span>
                    <span class="text-xs text-muted-foreground">Последнее изменение</span>
                  </div>
                </div>
              </UiHoverCardContent>
            </UiHoverCard>
          </UiTableCell>
          <UiTableCell class="w-10">
            <UiDropdownMenu v-if="row.canUpdate || row.canArchive">
              <UiDropdownMenuTrigger as-child>
                <UiButton variant="ghost" size="icon" :aria-label="`Действия: ${row.title}`"><MoreVertical /></UiButton>
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent align="end">
                <UiDropdownMenuGroup>
                  <UiDropdownMenuItem v-if="row.canUpdate" @click="emit('edit', row)"><Pencil />Редактировать</UiDropdownMenuItem>
                  <UiDropdownMenuItem v-if="row.canArchive" variant="destructive" @click="emit('delete', row)"><Trash2 />Удалить</UiDropdownMenuItem>
                </UiDropdownMenuGroup>
              </UiDropdownMenuContent>
            </UiDropdownMenu>
          </UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>
  </div>
</template>
