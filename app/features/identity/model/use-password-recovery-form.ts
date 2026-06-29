import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'
import { identityApi } from '../api/identity-api'
import {
  passwordRecoverySchema,
  type PasswordRecoveryValues,
} from './schemas'

export const RECOVERY_SUCCESS_MESSAGE =
  'Если аккаунт существует, ссылка отправлена на почту'
export const RECOVERY_ERROR_MESSAGE =
  'Не удалось отправить запрос. Попробуйте позже.'

interface PasswordRecoveryDependencies {
  readonly requestPasswordReset: (values: PasswordRecoveryValues) => Promise<void>
}

interface RecoveryOutcome {
  readonly status: string
  readonly error: string
}

export function createPasswordRecoveryAction(
  dependencies: PasswordRecoveryDependencies,
) {
  return async (values: PasswordRecoveryValues): Promise<RecoveryOutcome> => {
    try {
      await dependencies.requestPasswordReset(values)
      return { status: RECOVERY_SUCCESS_MESSAGE, error: '' }
    }
    catch {
      return { status: '', error: RECOVERY_ERROR_MESSAGE }
    }
  }
}

export function usePasswordRecoveryForm(
  dependencies?: PasswordRecoveryDependencies,
) {
  const action = createPasswordRecoveryAction(dependencies ?? {
    requestPasswordReset: identityApi.requestPasswordReset,
  })
  const submitError = ref('')
  const statusMessage = ref('')
  const { defineField, errors, handleSubmit, isSubmitting } = useForm({
    validationSchema: toTypedSchema(passwordRecoverySchema),
    initialValues: { email: '' },
  })
  const [email, emailAttrs] = defineField('email')
  const errorMessage = computed(() =>
    submitError.value || errors.value.email || '',
  )
  const submit = handleSubmit(async (values) => {
    submitError.value = ''
    statusMessage.value = ''
    const outcome = await action(values)
    submitError.value = outcome.error
    statusMessage.value = outcome.status
  })

  return {
    email,
    emailAttrs,
    errorMessage,
    statusMessage,
    isSubmitting,
    submit,
  }
}
