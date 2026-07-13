import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import { credentialsApi } from '../../api/credentials-api'
import type { CredentialSaveCommand } from '../credentials-state'

export const CREDENTIAL_ACTION = {
  LOAD: 'credentials.load',
  SAVE: 'credential.save',
  ARCHIVE: 'credential.archive',
  REVEAL_PASSWORD: 'credential.password.reveal',
  COPY_LOGIN: 'credential.login.copy',
  COPY_PASSWORD: 'credential.password.copy',
} as const

export class CredentialsActions extends BaseActions {
  constructor(private readonly projectId: string, options: BaseActionsOptions = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'credentials' })
  }

  public load = this.createAsyncAction({
    name: CREDENTIAL_ACTION.LOAD,
    run: (signal: AbortSignal) => credentialsApi.load(this.projectId, signal),
  })

  public save = this.createAsyncAction({
    name: CREDENTIAL_ACTION.SAVE,
    run: async (signal: AbortSignal, command: CredentialSaveCommand) => {
      if (command.kind === 'create') {
        await credentialsApi.create(this.projectId, command.body, signal)
      }
      else {
        await credentialsApi.update(this.projectId, command.credentialId, command.body, signal)
      }
      return await credentialsApi.load(this.projectId, signal)
    },
    idGetter: command => command.kind === 'update' ? command.credentialId : 'new',
  })

  public archive = this.createAsyncAction({
    name: CREDENTIAL_ACTION.ARCHIVE,
    run: async (signal: AbortSignal, credentialId: string) => {
      await credentialsApi.archive(this.projectId, credentialId, signal)
      return await credentialsApi.load(this.projectId, signal)
    },
    idGetter: credentialId => credentialId,
  })

  public revealPassword = this.createAsyncAction({
    name: CREDENTIAL_ACTION.REVEAL_PASSWORD,
    run: async (signal: AbortSignal, credentialId: string) =>
      (await credentialsApi.reveal(this.projectId, credentialId, 'password', signal)).value,
    idGetter: credentialId => credentialId,
  })

  public copyLogin = this.createAsyncAction({
    name: CREDENTIAL_ACTION.COPY_LOGIN,
    run: async (_signal: AbortSignal, credentialId: string, login: string) => {
      await navigator.clipboard.writeText(login)
      return `login:${credentialId}`
    },
    idGetter: credentialId => credentialId,
  })

  public copyPassword = this.createAsyncAction({
    name: CREDENTIAL_ACTION.COPY_PASSWORD,
    run: async (signal: AbortSignal, credentialId: string, visiblePassword: string | undefined) => {
      const value = visiblePassword ?? (await credentialsApi.reveal(this.projectId, credentialId, 'password', signal)).value
      await navigator.clipboard.writeText(value)
      return `password:${credentialId}`
    },
    idGetter: credentialId => credentialId,
  })
}
