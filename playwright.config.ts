import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global.setup.ts',
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bun run dev --host 127.0.0.1',
    url: 'http://127.0.0.1:3000/api/health/database',
    reuseExistingServer: false,
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://minerva:minerva@127.0.0.1:5433/minerva_test',
      BETTER_AUTH_SECRET: 'test-secret-012345678901234567890',
      BETTER_AUTH_URL: 'http://127.0.0.1:3000',
      TRUSTED_ORIGINS: 'http://127.0.0.1:3000',
      RATE_LIMIT_HMAC_SECRET: 'test-rate-limit-secret-01234567890',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1025',
      MAIL_FROM: 'Minerva <no-reply@minerva.local>',
      MAILPIT_API_URL: 'http://127.0.0.1:8025',
    },
  },
})
