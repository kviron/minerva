# Reset-password UI design

Status: approved in conversation, awaiting written-spec review
Date: 2026-06-28

## Goal

Add a static screen where a user who followed a password-reset email link can enter and confirm a new password. This slice covers presentation only; token validation, password comparison, submission, success feedback, and server behavior remain out of scope.

## Components and route

- Add `app/components/ResetPasswordForm/index.vue` as a focused presentation component.
- Render it from the existing tokenized route at `app/pages/auth/reset-password/[token].vue`.
- Reuse the two-column auth composition, Minerva branding, responsive behavior, and right-side visual already used by the sign-in and forgot-password pages.
- Do not read, render, log, or otherwise expose the route token in this UI-only slice.

## Form composition

`ResetPasswordForm` follows the established auth-form API and shadcn-vue composition:

- optional `class` prop merged with `cn`;
- native `form` root with a vertical gap;
- `UiFieldGroup`, `UiField`, `UiFieldLabel`, `UiInput`, and `UiButton` primitives;
- centered heading “Новый пароль”;
- short Russian explanation asking the user to enter the new password twice;
- required “Новый пароль” input with `type="password"` and `autocomplete="new-password"`;
- required “Подтвердите пароль” input with `type="password"` and `autocomplete="new-password"`;
- full-width submit button labeled “Сохранить новый пароль”;
- secondary `NuxtLink` labeled “Вернуться ко входу” targeting `/auth`.

The form has no client-side state or submit handler in this slice. It must not claim that the password changed.

## Accessibility and localization

- Each label is explicitly associated with a unique input ID.
- Both password fields use native required and password semantics.
- Navigation uses `NuxtLink` rather than placeholder anchors.
- User-facing copy remains Russian, matching the default locale.
- The auth image is decorative and uses an empty alternative text value.

## Verification

- Confirm the tokenized reset-password route renders `ResetPasswordForm` inside the established responsive auth shell.
- Confirm both password fields have unique IDs, `type="password"`, and `autocomplete="new-password"`.
- Confirm the return link targets `/auth` and no route token is rendered.
- Run the Nuxt production build to catch template and auto-import errors.
- Inspect the scoped diff to preserve unrelated working-tree changes.

## Deferred behavior

- Reset-token validation and expiry handling.
- Password-strength and password-match validation.
- Better Auth password-update integration.
- Loading, error, invalid-link, and success states.
- Session revocation and redirect behavior after a successful reset.
