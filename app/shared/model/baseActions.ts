import { ref } from 'vue'
import { parseApiError } from '../utils/parseError'

export type ActionStatus = 'success' | 'error'
export type ActionTargetId = string | number

export type AnalyticsTrackerFn = (payload: Readonly<{
  feature: string
  action: string
  targetId: ActionTargetId
  status: ActionStatus
  errorMessage?: string
}>) => void

export interface BaseActionsOptions {
  onMutationSuccess?: () => void
  onError?: (errorMessage: string, rawError: unknown) => void
  concurrency?: 'abort' | 'ignore' | 'allow'
  analyticsTag?: string
  tracker?: AnalyticsTrackerFn
  meta?: Readonly<Record<string, unknown>>
}

export interface ActionConfig {
  errorMessage?: string
  onError?: (errorMessage: string, rawError: unknown) => void
  mutation?: boolean
  concurrency?: 'abort' | 'ignore' | 'allow'
}

export interface AsyncActionDefinition<Args extends unknown[], T> {
  name: string
  run: (signal: AbortSignal, ...args: Args) => Promise<T>
  idGetter?: (...args: Args) => ActionTargetId | null
  options?: ActionConfig
}

export interface SyncActionDefinition<Args extends unknown[], T> {
  name: string
  run: (...args: Args) => T
  idGetter?: (...args: Args) => ActionTargetId | null
  options?: ActionConfig
}

export abstract class BaseActions {
  public readonly isPending = ref(false)
  public readonly pendingMap = ref<Record<string, boolean>>({})
  public readonly error = ref<string | null>(null)
  private readonly abortControllers = new Map<string, AbortController>()

  constructor(protected readonly options: BaseActionsOptions = {}) {}

  public isPendingFor(actionName: string, targetId: ActionTargetId = 'global'): boolean {
    return this.pendingMap.value[this.pendingKey(actionName, targetId)] === true
  }

  public clearError(): void {
    this.error.value = null
  }

  protected createAsyncAction<Args extends unknown[], T>({ name, run, idGetter, options = {} }: AsyncActionDefinition<Args, T>) {
    return async (...args: Args): Promise<T | undefined> => {
      const targetId = idGetter?.(...args) ?? 'global'
      const key = this.pendingKey(name, targetId)
      const concurrency = options.concurrency ?? this.options.concurrency ?? 'ignore'
      if (concurrency === 'ignore' && this.pendingMap.value[key]) {
        return undefined
      }
      if (concurrency === 'abort') {
        this.abortControllers.get(key)?.abort()
      }

      const controller = new AbortController()
      if (concurrency === 'abort') {
        this.abortControllers.set(key, controller)
      }
      this.setLoading(key, true)
      this.error.value = null

      try {
        const result = await run(controller.signal, ...args)
        if (options.mutation !== false) {
          this.options.onMutationSuccess?.()
        }
        this.trackAction(name, targetId, 'success')
        return result
      }
      catch (rawError: unknown) {
        if (rawError instanceof DOMException && rawError.name === 'AbortError') {
          return undefined
        }
        const message = options.errorMessage ?? parseApiError(rawError)
        this.error.value = message
        if (options.onError) {
          options.onError(message, rawError)
        }
        else {
          this.options.onError?.(message, rawError)
        }
        this.trackAction(name, targetId, 'error', message)
        return undefined
      }
      finally {
        if (concurrency !== 'abort' || this.abortControllers.get(key) === controller) {
          this.setLoading(key, false)
          this.abortControllers.delete(key)
        }
      }
    }
  }

  protected createSyncAction<Args extends unknown[], T>({ name, run, idGetter, options = {} }: SyncActionDefinition<Args, T>) {
    return (...args: Args): T | undefined => {
      const targetId = idGetter?.(...args) ?? 'global'
      this.error.value = null
      try {
        const result = run(...args)
        this.trackAction(name, targetId, 'success')
        return result
      }
      catch (rawError: unknown) {
        const message = options.errorMessage ?? parseApiError(rawError)
        this.error.value = message
        if (options.onError) {
          options.onError(message, rawError)
        }
        else {
          this.options.onError?.(message, rawError)
        }
        this.trackAction(name, targetId, 'error', message)
        return undefined
      }
    }
  }

  private pendingKey(actionName: string, targetId: ActionTargetId): string {
    return `${actionName}:${targetId}`
  }

  private setLoading(key: string, value: boolean): void {
    const next = { ...this.pendingMap.value }
    if (value) {
      next[key] = true
    }
    else {
      delete next[key]
    }
    this.pendingMap.value = next
    this.isPending.value = Object.keys(next).length > 0
  }

  private trackAction(action: string, targetId: ActionTargetId, status: ActionStatus, errorMessage?: string): void {
    this.options.tracker?.({
      feature: this.options.analyticsTag ?? 'unknown-feature',
      action,
      targetId,
      status,
      ...(errorMessage ? { errorMessage } : {}),
    })
  }
}
