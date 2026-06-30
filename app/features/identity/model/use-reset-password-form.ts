import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { identityApi } from '../api/identity-api'
import { resetPasswordSchema, type ResetPasswordValues } from './schemas'

export const RESET_TOKEN_ERROR =
  'Ссылка недействительна или уже использована'

interface ResetPasswordDependencies {
  readonly resetPassword: (input: {
    readonly token: string
    readonly newPassword: string
  }) => Promise<void>
  readonly navigate: (path: string) => Promise<unknown> | unknown
}

export function createResetPasswordAction(
  dependencies: ResetPasswordDependencies,
) {
  return async (
    token: string,
    values: ResetPasswordValues,
  ): Promise<string | null> => {
    try {
      await dependencies.resetPassword({
        token,
        newPassword: values.password,
      })
    }
    catch {
      return RESET_TOKEN_ERROR
    }

    await dependencies.navigate('/auth')
    return null
  }
}

export function useResetPasswordForm(
  token: MaybeRefOrGetter<string>,
  dependencies?: ResetPasswordDependencies,
) {
  const action = createResetPasswordAction(dependencies ?? {
    resetPassword: identityApi.resetPassword,
    navigate: path => navigateTo(path),
  })
  const submitError = ref('')
  const { defineField, errors, handleSubmit, isSubmitting } = useForm({
    validationSchema: toTypedSchema(resetPasswordSchema),
    initialValues: { password: '', confirmation: '' },
  })
  const [password, passwordAttrs] = defineField('password')
  const [confirmation, confirmationAttrs] = defineField('confirmation')
  const passwordError = computed(() => errors.value.password || '')
  const confirmationError = computed(() => errors.value.confirmation || '')
  const passwordInvalid = computed(() => Boolean(passwordError.value))
  const confirmationInvalid = computed(() => Boolean(confirmationError.value))
  const clearSubmitError = () => {
    submitError.value = ''
  }
  const validatedSubmit = handleSubmit(async (values) => {
    clearSubmitError()
    submitError.value = await action(toValue(token), values) ?? ''
  }, () => {
    clearSubmitError()
  })
  let activeSubmit: ReturnType<typeof validatedSubmit> | undefined
  const submit: typeof validatedSubmit = (...args) => {
    if (activeSubmit)
      return activeSubmit

    const pending = validatedSubmit(...args)
    const guarded = pending.finally(() => {
      if (activeSubmit === guarded)
        activeSubmit = undefined
    })
    activeSubmit = guarded
    return guarded
  }

  return {
    password,
    passwordAttrs,
    confirmation,
    confirmationAttrs,
    passwordError,
    confirmationError,
    submitError,
    passwordInvalid,
    confirmationInvalid,
    isSubmitting,
    submit,
  }
}
