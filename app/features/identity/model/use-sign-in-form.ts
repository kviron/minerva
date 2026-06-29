import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'
import { identityApi } from '../api/identity-api'
import { SIGN_IN_ERROR, signInSchema, type SignInValues } from './schemas'

interface SignInDependencies {
  readonly signIn: (values: SignInValues) => Promise<void>
  readonly navigate: (path: string) => Promise<unknown> | unknown
}

export function createSignInAction(dependencies: SignInDependencies) {
  return async (values: SignInValues): Promise<string | null> => {
    try {
      await dependencies.signIn(values)
    }
    catch {
      return SIGN_IN_ERROR
    }

    await dependencies.navigate('/')
    return null
  }
}

export function useSignInForm(dependencies?: SignInDependencies) {
  const action = createSignInAction(dependencies ?? {
    signIn: identityApi.signIn,
    navigate: path => navigateTo(path),
  })
  const submitError = ref('')
  const { defineField, errors, handleSubmit, isSubmitting } = useForm({
    validationSchema: toTypedSchema(signInSchema),
    initialValues: { identifier: '', password: '' },
  })
  const [identifier, identifierAttrs] = defineField('identifier')
  const [password, passwordAttrs] = defineField('password')
  const identifierInvalid = computed(() =>
    Boolean(submitError.value || errors.value.identifier),
  )
  const passwordInvalid = computed(() =>
    Boolean(submitError.value || errors.value.password),
  )
  const errorMessage = computed(() =>
    submitError.value || errors.value.identifier || errors.value.password || '',
  )
  const submit = handleSubmit(async (values) => {
    submitError.value = ''
    submitError.value = await action(values) ?? ''
  })

  return {
    identifier,
    identifierAttrs,
    password,
    passwordAttrs,
    identifierInvalid,
    passwordInvalid,
    errorMessage,
    isSubmitting,
    submit,
  }
}
