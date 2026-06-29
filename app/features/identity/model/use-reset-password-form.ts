import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'
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
  token: string,
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
  const passwordInvalid = computed(() =>
    Boolean(submitError.value || errors.value.password),
  )
  const confirmationInvalid = computed(() =>
    Boolean(submitError.value || errors.value.confirmation),
  )
  const errorMessage = computed(() =>
    submitError.value || errors.value.password || errors.value.confirmation || '',
  )
  const clearSubmitError = () => {
    submitError.value = ''
  }
  const submit = handleSubmit(async (values) => {
    clearSubmitError()
    submitError.value = await action(token, values) ?? ''
  }, () => {
    clearSubmitError()
  })

  return {
    password,
    passwordAttrs,
    confirmation,
    confirmationAttrs,
    passwordInvalid,
    confirmationInvalid,
    errorMessage,
    isSubmitting,
    submit,
  }
}
