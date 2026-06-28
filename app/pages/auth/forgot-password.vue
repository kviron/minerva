<script setup lang="ts">
import { GalleryVerticalEnd } from "@lucide/vue"
definePageMeta({
  layout: "empty",
  title: "Забыли пароль",
})
</script>

<template>
  <div class="grid min-h-svh lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex justify-center gap-2 md:justify-start">
        <NuxtLink to="/auth" class="flex items-center gap-2 font-medium">
          <div class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd class="size-4" />
          </div>
          Минерва
        </NuxtLink>
      </div>
      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-xs">
          <AuthForgotPasswordForm />
        </div>
      </div>
    </div>
    <div class="bg-muted relative hidden lg:block">
      <img
        src="/images/auth/minerva-auth-visual.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover"
      >
    </div>
  </div>
</template>
