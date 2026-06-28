# Forgot-password UI design

Status: approved
Date: 2026-06-28

## Goal

Add a static password-recovery request screen that matches the existing sign-in screen. This slice covers presentation and navigation only; password-reset submission, validation, success feedback, and server behavior remain out of scope.

## Components and routes

- Add `app/components/ForgotPasswordForm/index.vue` as a focused presentation component.
- Render it from the existing `/auth/forgot-password` route at `app/pages/auth/forgot-password.vue`.
- Change the “Забыли пароль?” action in `LoginForm` to navigate to `/auth/forgot-password` with `NuxtLink`.
- Keep the same two-column auth composition, Minerva branding, responsive behavior, and right-side visual used by `/auth`.

## Form composition

`ForgotPasswordForm` follows the established `LoginForm` API and shadcn-vue composition:

- optional `class` prop merged with `cn`;
- native `form` root with a vertical gap;
- `UiFieldGroup`, `UiField`, `UiFieldLabel`, `UiInput`, and `UiButton` primitives;
- centered heading “Восстановление пароля”;
- short Russian explanation that a reset link will be sent to the entered email;
- required email input with `type="email"`, `autocomplete="email"`, and an example placeholder;
- full-width submit button labeled “Отправить ссылку”;
- secondary `NuxtLink` labeled “Вернуться ко входу” targeting `/auth`.

The page is static in this slice. Submitting the form must not claim that an email was sent or reveal whether an account exists.

## Accessibility and localization

- The field label is explicitly associated with its input.
- The input uses native email semantics and required-state semantics.
- Interactive navigation uses links rather than placeholder anchors.
- User-facing copy remains Russian, matching the project's default locale.
- The decorative auth image keeps the same treatment as the sign-in page.

## Verification

- Confirm the forgot-password route renders `ForgotPasswordForm` inside the same responsive auth shell as sign-in.
- Confirm the sign-in recovery link targets `/auth/forgot-password` and the recovery form return link targets `/auth`.
- Run the available Nuxt build or type-generation check to catch template and auto-import errors.
- Inspect the resulting diff to ensure no unrelated user changes are included.

## Deferred behavior

- Better Auth password-recovery integration.
- Enumeration-safe request handling and rate limiting.
- Loading, validation, error, and success states.
- Reset-token form at `/auth/reset-password/[token]`.
