import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node',
    environmentOptions: {
      nuxt: {},
    },
    include: ['tests/unit/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
    },
  },
})
