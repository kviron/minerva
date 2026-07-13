# Project Credentials Design

Date: 2026-07-11  
Status: approved in interactive design review

## Goal

Provide a secure project page where authorized members can find credentials in user-created categories, while Project Admins can create categories, assign category access to roles or individual members, and create or edit credentials with dynamic fields.

## Scope and invariants

- A project starts with no credential categories; there are no templates or seeded names.
- Categories have one level and cannot contain child categories.
- Every credential belongs to exactly one non-archived category at creation time.
- Project Admin always sees and administers every category.
- Other members see a category when their role or their membership has an allow grant.
- A hidden category and every credential inside it are absent from list, search, count, and error projections.
- Authorization is enforced in shared server application services; UI visibility is never the authority.
- Credentials are excluded from MCP.

## Permission vocabulary

Add `credentials.view`, `credentials.create`, `credentials.update`, `credentials.archive`, `credential_categories.create`, `credential_categories.update`, `credential_categories.archive`, and `credential_categories.manage_access`.

Built-in Admin receives all codes. Editor and Viewer receive none by default. Custom roles may receive them through the existing role matrix. Category access is a second required decision after `credentials.view`; Project Admin bypasses only the category-grant lookup, not active membership/account checks.

## Data model

`credential_categories` stores project, name, optional description, position, archive metadata, creator, and timestamps. Active names are unique per project after normalization.

`credential_category_role_grants` joins a category to a role from the same project. `credential_category_member_grants` joins a category to an active membership from the same project. Grants are allow-only and unique per category/subject.

`credentials` stores project, category, title, encrypted optional login and password values, creator/updater, timestamps, and archive metadata. `credential_fields` stores credential, stable id, label, type, position, and encrypted value. Supported types are `text`, `secret`, `url`, and `note`. All dynamic values are encrypted regardless of display type.

Encrypted values include ciphertext, nonce/IV, authentication data required by the selected primitive, and key version. Keys are validated server configuration and never stored in PostgreSQL.

## Application and API boundaries

Shared services list accessible categories and password-masked rows with visible logins; create/update/archive categories; replace grants transactionally; create/update/archive credentials and ordered fields; reveal one authorized password field; and write audit-safe events.

Every operation rechecks project, active membership, permission, category access, and archive state. Missing and inaccessible objects return the same 404. Foreign-project role or membership grants are rejected. Revocation applies on the next request.

Authorized list responses contain login plaintext but no password plaintext and use `Cache-Control: no-store`. Password reveal returns one requested field and is separately authorized, rate-limited, and audited. Clients never persist plaintext in local storage, cookies, route state, or query caches.

## Page composition

`/projects/:id/credentials` renders a heading, security description, `Управление категориями`, and `Новая учётная запись` when authorized. Categories are a filter, not tabs. Search uses safe metadata only.

The shadcn-vue Table columns are `Название`, `Категория`, `Логин`, `Пароль`, `Изменено`, and a narrow actions column. Login is visible with a compact copy button. Password is masked with compact show/hide and copy buttons backed by the reveal endpoint. A rightmost ghost icon button opens an end-aligned `DropdownMenu` with the initial action `Редактировать` and an accessible Russian label.

With no categories, the installed `Empty` composition explains that the administrator must create the first category and offers `Создать категорию`. No predefined category is rendered or persisted; examples may appear only as placeholder help.

## Category and credential editors

`Управление категориями` opens a titled Sheet with category list and create/edit actions. The form uses `FieldGroup`/`Field` for name, description, role grants, and individual member grants. Built-in Project Admin access is explained and cannot be unchecked. Only active same-project roles and memberships are candidates.

Credential create/edit uses a titled Sheet with title, required category, login, password, and ordered dynamic fields. `Добавить поле` adds label, type, value, drag handle, and remove action. Secret inputs are masked by default.

Editing uses explicit keep, replace, and clear commands; masked placeholder text is never submitted as a value. Closing clears plaintext client state.

## Security and lifecycle

- Authenticated encryption and key versioning are mandatory before persistence.
- Plaintext never enters logs, errors, analytics, audit payloads, MCP, backups outside ciphertext, or indexes.
- Reveal/copy and every mutation are audited with ids and field metadata only.
- Archival is recoverable. Archiving a non-empty category requires confirmation and archives its credentials transactionally.
- Key rotation and operational recovery must be proven before production deployment.

## Acceptance and deferred work

Tests prove Admin invariant, role/member union grants, immediate revocation, cross-project rejection, indistinguishable 404s, ciphertext at rest, tamper failure, masked lists, safe audit, transactional fields, and MCP absence. UI tests cover Table/DropdownMenu, Empty, Sheets, dynamic fields, masking, and permissions.

Deferred: explicit deny, nested categories, cross-project sharing, secret history/rotation workflows, bulk import/export, automatic login, browser extensions, and all MCP access.
