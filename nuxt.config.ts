import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  $env: {
    test: {
      // E2E-only terminal handler proving successful administration guard passage.
      serverHandlers: [{
        route: '/api/administration/probe',
        handler: './tests/e2e/fixtures/administration-probe',
      }],
    },
  },
  css: ['~/assets/css/tailwind.css'],
  compatibilityDate: '2025-01-01',
  nitro: {
    preset: 'bun'
  },
  vite: {
    plugins: [tailwindcss()],
  },
  ssr: false,
  modules: ['shadcn-nuxt', '@nuxtjs/color-mode'],
  shadcn: {
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: 'Ui',
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
    componentDir: '@/components/ui'
  }
})
