# Projects List and Create UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build real membership-scoped and super-admin project lists, a reusable shadcn-vue table/empty experience, and working project creation from the authenticated web UI.

**Architecture:** Projects application services produce two server-owned safe projections: membership scope and global administration scope. Thin Nitro handlers authenticate and call those services; a Nuxt-native `app/features/projects` module strictly parses responses and composes shared Table/Empty/Dialog UI for `/projects` and `/administration/projects`.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Nitro/H3, Drizzle/PostgreSQL, shadcn-vue/Reka UI, vee-validate/Zod, Vitest, Vue Test Utils, Playwright, Bun.

---

## File map

- Create `shared/projects/contracts.ts`: safe list-row and endpoint response contracts.
- Create `server/modules/projects/list-projects.ts`: member/admin SQL projections.
- Create `server/api/projects/index.get.ts`, `index.post.ts`, and `server/api/administration/projects.get.ts`: authenticated adapters.
- Create `app/features/projects/api/projects-api.ts`: HTTP adapters and strict unknown parsers.
- Create `app/features/projects/model/projects-state.ts`, `project-filters.ts`, and `presentation.ts`: pure interaction/presentation state.
- Create `app/features/projects/ui/ProjectsView.vue`, `ProjectsTable.vue`, `ProjectsEmpty.vue`, `ProjectsTableSkeleton.vue`, and `CreateProjectDialog.vue`.
- Create `app/features/projects/index.ts`: deliberate public API.
- Modify `app/pages/projects/index.vue`; create `app/pages/administration/projects.vue`; add shared administration tabs/navigation composition without redesigning other administration pages.
- Add shadcn-vue `badge` and `select` source components through the project Bun runner; reuse installed Table, Empty, Dialog, Alert, Skeleton, Field, Input, Textarea, Button, and Tabs.
- Add focused unit, PostgreSQL integration, and Playwright tests.

### Task 1: Safe project list contracts and application queries

**Files:**
- Create: `shared/projects/contracts.ts`
- Create: `server/modules/projects/list-projects.ts`
- Create: `tests/integration/projects/list-projects.spec.ts`

- [ ] **Step 1: Write failing PostgreSQL integration tests**

Seed two users, active/removed memberships, active/archived projects, built-in and custom roles. Assert the member query returns only active memberships in newest-updated order and returns:

```ts
{
  id: string,
  name: string,
  description: string | null,
  status: 'active' | 'archived',
  updatedAt: string,
  role: { builtInKey: 'admin' | 'editor' | 'viewer'; customName: null }
      | { builtInKey: null; customName: string },
}
```

Assert a `super_admin` without membership receives no rows from the member query. Assert the administration query returns every project with `activeMemberCount`, including zero.

- [ ] **Step 2: Verify RED**

Run `bunx vitest run tests/integration/projects/list-projects.spec.ts`. Expected: FAIL because contracts and query services do not exist.

- [ ] **Step 3: Implement readonly contracts and queries**

Export `MemberProjectListItem`, `AdministrationProjectListItem`, and readonly response arrays. Implement dependency-injected `listMemberProjects(db, userId)` and `listAdministrationProjects(db)` using explicit Drizzle selections, active-membership predicates, grouped active-member count, and deterministic `updatedAt DESC, id ASC` ordering. Convert dates to ISO strings at the application-service boundary.

- [ ] **Step 4: Verify GREEN and commit**

Run the focused integration test and `bun run typecheck`. Commit as `feat: query accessible project lists`.

### Task 2: Authenticated list and creation endpoints

**Files:**
- Create: `server/api/projects/index.get.ts`
- Create: `server/api/projects/index.post.ts`
- Create: `server/api/administration/projects.get.ts`
- Create: `tests/unit/projects/project-handlers.spec.ts`
- Extend: `tests/integration/projects/create-project.spec.ts`

- [ ] **Step 1: Write failing handler tests**

Use injected factories around session/authorization/service capabilities. Prove GET member scope derives only `session.user.id`; admin GET calls strict `requireSuperAdmin`; POST passes server-owned actor and `AUDIT_CHANNEL.WEB`, never client actor fields; malformed bodies and domain results map to stable safe status/code responses.

```ts
expect(createProject).toHaveBeenCalledWith({
  actor: { userId: session.user.id, accountStatus: session.user.status },
  channel: AUDIT_CHANNEL.WEB,
  name: 'Альфа',
  description: 'Описание',
})
```

- [ ] **Step 2: Verify RED**

Run `bunx vitest run tests/unit/projects/project-handlers.spec.ts`. Expected: FAIL because endpoint factories do not exist.

- [ ] **Step 3: Implement thin handlers**

Parse POST as unknown, allow only `name` and `description`, and reject wrong types. Map `AUTH_REQUIRED` to 401, `ACCOUNT_INACTIVE` to 403, validation codes to 400, and `PROJECT_CREATE_FAILED` to 503 using the existing `{ data: { code } }` error contract. Return creation success as `{ projectId }`. Endpoint modules instantiate handlers with `requireSession`, `requireSuperAdmin`, query services, `createProject`, and `getDatabase().db`.

- [ ] **Step 4: Prove the real project graph and commit**

Extend integration coverage to call the handler capability with a real database and prove the session actor becomes creator/Admin and audit actor. Run focused unit/integration tests and commit as `feat: expose project list and creation APIs`.

### Task 3: Strict client API and pure project state

**Files:**
- Create: `app/features/projects/api/projects-api.ts`
- Create: `app/features/projects/model/project-filters.ts`
- Create: `app/features/projects/model/presentation.ts`
- Create: `app/features/projects/model/projects-state.ts`
- Create: `tests/unit/client/projects/projects-api.spec.ts`
- Create: `tests/unit/client/projects/project-filters.spec.ts`
- Create: `tests/unit/client/projects/projects-state.spec.ts`

- [ ] **Step 1: Write failing parser/filter/state tests**

Test exact member/admin object shapes, UUID/string/date/status/role/count validation, rejection of extra/missing/private fields, case-insensitive Russian search over name/description, status filter/reset, safe load errors, retry, duplicate create guard, retained form values on failure, and authoritative reload after success.

- [ ] **Step 2: Verify RED**

Run `bunx vitest run tests/unit/client/projects`. Expected: FAIL because the feature modules do not exist.

- [ ] **Step 3: Implement minimal pure modules**

Create separate `loadMember`, `loadAdministration`, and `create` adapters around `$fetch`. Never trust casted JSON. State owns readonly source rows, derived visible rows, pending/error flags, and scope-specific reload capability. Safe Russian messages must not include caught exception text.

Presentation helpers map built-in keys to `Администратор`, `Редактор`, `Наблюдатель`; statuses to `Активен`/`Архив`; dates via `Intl.DateTimeFormat('ru-RU')`.

- [ ] **Step 4: Verify GREEN and commit**

Run focused tests and typecheck. Commit as `feat: add projects client state`.

### Task 4: shadcn-vue table, empty, loading, and error composition

**Files:**
- Add: `app/components/ui/badge/**`
- Add: `app/components/ui/select/**`
- Create: `app/features/projects/ui/ProjectsTable.vue`
- Create: `app/features/projects/ui/ProjectsEmpty.vue`
- Create: `app/features/projects/ui/ProjectsTableSkeleton.vue`
- Create: `app/features/projects/ui/ProjectsView.vue`
- Create: `tests/unit/client/projects/projects-ui.spec.ts`

- [ ] **Step 1: Load shadcn-vue guidance and docs**

Invoke the repository `shadcn-vue` skill, run `bunx shadcn-vue@latest info --json`, then `bunx shadcn-vue@latest docs table empty badge select alert skeleton`. Add only missing `badge` and `select` through `bunx shadcn-vue@latest add badge select`; inspect every added file and preserve configured Lucide icons/semantic tokens.

- [ ] **Step 2: Write failing component tests**

Mount the shared view with controlled state. Assert Table-family semantics and mode-specific headings, project links, Badge/status/role/member-count rendering, table-shaped loading skeleton, safe Alert/retry, unfiltered shadcn Empty with create action, and filtered Empty with reset but no create CTA.

- [ ] **Step 3: Verify RED**

Run `bunx vitest run tests/unit/client/projects/projects-ui.spec.ts`. Expected: FAIL because feature UI is absent.

- [ ] **Step 4: Implement the Figma composition**

Use page padding `px-4 lg:px-6`, heading/action row, controls with `flex flex-col gap-3 sm:flex-row`, local Input/Select, and a bordered rounded Table container. Do not use raw color utilities, manual table divs, `space-*`, or manual dark overrides. `ProjectsView` selects loading/error/source-empty/filter-empty/table states and emits `retry`, `create`, and `reset-filters`.

- [ ] **Step 5: Verify GREEN and commit**

Run focused tests and typecheck. Commit UI source plus newly added shadcn primitives as `feat: render project list states`.

### Task 5: Project creation dialog and page integration

**Files:**
- Create: `app/features/projects/ui/CreateProjectDialog.vue`
- Create: `app/features/projects/model/use-create-project-form.ts`
- Create: `app/features/projects/index.ts`
- Modify: `app/pages/projects/index.vue`
- Create: `app/pages/administration/projects.vue`
- Create or modify focused administration navigation component used by administration pages
- Create: `tests/unit/client/projects/create-project-dialog.spec.ts`
- Create: `tests/unit/client/projects/project-pages.spec.ts`

- [ ] **Step 1: Write failing form/page tests**

Prove Russian labels, required/120 name and optional/2000 description validation, accessible Field errors, duplicate-submit prevention, pending label, retained values/safe error on failure, reset on close, success close/reload, member/admin scopes, and administration Projects tab link. Prove ordinary route authorization remains server/session derived.

- [ ] **Step 2: Verify RED**

Run the two focused specs. Expected: FAIL because dialog/pages do not exist.

- [ ] **Step 3: Implement dialog and pages**

Use vee-validate + Zod and shadcn `FieldGroup`/`Field`, Dialog, Input, Textarea, and Button. Both heading and Empty CTA open one dialog instance. `/projects` creates member state; `/administration/projects` creates administration state. On successful creation, close/reset and await current-scope reload.

Administration navigation uses installed Tabs with links for existing Users, Invitations, Audit, and new Projects routes; it does not move authorization into UI visibility.

- [ ] **Step 4: Verify GREEN and commit**

Run all Projects unit tests and typecheck. Commit as `feat: connect project list pages`.

### Task 6: Browser journeys, full verification, and progress

**Files:**
- Create: `tests/e2e/projects.spec.ts`
- Modify e2e fixtures/setup only as needed for isolated project users and projects
- Modify: `docs/progress.md`
- Refresh only: `.tesserae/**`

- [ ] **Step 1: Write failing browser journeys**

Cover member table scope, no-project Empty, filtered Empty/reset, successful Dialog creation without reload, safe retry after intercepted GET failure, all-project administration table/member counts, and ordinary-user denial from administration page and endpoint.

- [ ] **Step 2: Verify RED then GREEN**

Run `bunx playwright test tests/e2e/projects.spec.ts --workers=1`. Confirm initial feature absence, implement only deterministic fixture/setup support, rerun until every new journey passes.

- [ ] **Step 3: Run complete verification**

Run `bun run test:unit`, `bun run test:integration`, `bun run test:e2e`, `bun run typecheck`, and `bun run build`. Record exact counts and retain any known upstream build warnings explicitly.

- [ ] **Step 4: Update canonical progress and Tesserae**

Add one `docs/progress.md` bullet describing member/admin scope, Table/Empty/Dialog behavior, and exact evidence. Run `./scripts/refresh-tesserae.ps1`; require `sessions-import`, `compile`, and `obsidian-sync` to report `ok`. Never stage `.tesserae`, `.output`, secrets, uploads, or indexes.

- [ ] **Step 5: Scope check and documentation commit**

Run `git diff --check`, inspect status, preserve the user's sidebar edit and existing generated dirt, then commit only progress documentation as `docs: record projects list UI`.

