<template>
  <div class="min-h-dvh bg-background text-foreground">
    <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div class="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 lg:px-6">
        <NuxtLink to="/" class="font-semibold tracking-tight">Minerva</NuxtLink>
        <div class="flex items-center gap-2">
          <ModeToggle />
          <UiButton as-child variant="outline" size="sm"><NuxtLink to="/auth">Войти</NuxtLink></UiButton>
        </div>
      </div>
    </header>
    <slot />
  </div>
</template>
