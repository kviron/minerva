# Minerva Figma Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate an eight-screen clickable desktop prototype for Minerva in the supplied Figma file.

**Architecture:** Create three Figma pages: `Foundations`, `Components`, and `MVP Flow`. Reproduce only the shadcn-vue `new-york` primitives required by the approved screens, then compose every screen from shared local components and one consistent application shell. Use Russian visible copy, English layer names, auto layout, Slate semantic colors, a restrained violet primary, and Lucide-style icons.

**Tech Stack:** Figma Design, Figma Plugin API through `use_figma`, shadcn-vue `new-york` visual conventions, Slate/Violet semantic tokens, Lucide icons.

**Target file:** `zRIOKJjqh8RiQt20IhZWZP`  
**Approved specification:** `docs/superpowers/specs/2026-06-24-minerva-ui-prototype-design.md`

---

## Execution rules

- Load `figma:figma-use` before every `use_figma` call.
- Load `figma:figma-generate-design` for composed screen work.
- Load `figma:figma-generate-library` before creating local reusable components.
- Inspect before writing; do not overwrite unrelated nodes.
- Work incrementally and return every created or mutated node ID.
- Use one Figma page switch at most per `use_figma` call.
- Validate every major section with a screenshot before continuing.
- Stop and inspect after any Figma tool error; do not retry blindly.
- Do not create application source code during this plan.

### Task 1: Audit the target file and establish page structure

**Figma changes:**
- Inspect: `Page 1`, node `1:30`
- Create page: `Foundations`
- Create page: `Components`
- Create page: `MVP Flow`
- Preserve page: `Page 1`

- [ ] **Step 1: Load required Figma guidance**

Read:

```text
figma:figma-use
figma:figma-generate-design
figma:figma-generate-library
figma-use/references/plugin-api-standalone.index.md
figma-use/references/working-with-design-systems/wwds.md
figma-use/references/gotchas.md
```

Expected: all mandatory Plugin API, design-system, font, auto-layout, and error-recovery rules are available before the first write.

- [ ] **Step 2: Inspect the existing file**

Use `get_metadata`, `get_design_context`, and `get_screenshot` for page `0:1` and node `1:30`.

Expected:

```text
Page 1 contains one blank 647 × 692 frame named Frame 1.
No existing Minerva components, variables, or finished screens need preservation.
```

- [ ] **Step 3: Check component sources in the required order**

1. Search the repository for `*.figma.ts`, `*.figma.tsx`, and `*.figma.js`.
2. Inspect existing target-file screens for component instances.
3. Record both results as unavailable.
4. Call `get_libraries`.
5. Search the available libraries for `button`, `input`, `sidebar`, `table`, `dialog`, `tabs`, `badge`, `avatar`, `breadcrumb`, and `command`.

Expected: no compatible shadcn-vue library is linked; local prototype components are required. Do not substitute Material components.

- [ ] **Step 4: Create the three working pages**

Use one `use_figma` call to create:

```text
Foundations
Components
MVP Flow
```

Keep `Page 1` unchanged as the supplied source page. Return all page IDs.

- [ ] **Step 5: Verify page structure**

Use `get_metadata` without a node ID.

Expected: exactly four top-level pages are visible: `Page 1`, `Foundations`, `Components`, and `MVP Flow`.

### Task 2: Build semantic foundations

**Figma changes:**
- Modify page: `Foundations`
- Create collection: `Minerva Semantic`
- Create frames: `Color tokens`, `Typography`, `Spacing and radius`

- [ ] **Step 1: Create semantic color variables**

Create a local collection named `Minerva Semantic` with modes `Light` and `Dark`.

Create and scope these variables:

```text
background
foreground
card
card-foreground
popover
popover-foreground
primary
primary-foreground
secondary
secondary-foreground
muted
muted-foreground
accent
accent-foreground
destructive
destructive-foreground
border
input
ring
sidebar
sidebar-foreground
sidebar-accent
sidebar-accent-foreground
sidebar-border
```

Use Slate semantic values and Violet primary values compatible with the shadcn `new-york` presentation. Set explicit variable scopes for fills, strokes, or text.

- [ ] **Step 2: Create spacing and radius variables**

Create number variables:

```text
space-1 = 4
space-2 = 8
space-3 = 12
space-4 = 16
space-5 = 20
space-6 = 24
space-8 = 32
radius-sm = 6
radius-md = 8
radius-lg = 10
```

Use `GAP`, padding, and corner-radius scopes as appropriate.

- [ ] **Step 3: Create typography styles**

Verify available Inter font names, then create:

```text
Display / 30 / Semi Bold
Heading / 24 / Semi Bold
Heading / 20 / Semi Bold
Body / 16 / Regular
Body / 14 / Regular
Label / 14 / Medium
Caption / 12 / Regular
Mono / 13 / Regular
```

Use the verified Figma style name `Semi Bold`, not `SemiBold`.

- [ ] **Step 4: Build the foundations reference frames**

On `Foundations`, create three auto-layout frames showing:

- light and dark semantic color swatches;
- the complete type ramp with Russian sample copy;
- spacing and radius examples.

Return every created node ID.

- [ ] **Step 5: Validate foundations**

Take screenshots of each reference frame.

Expected:

- no clipped Russian text;
- Violet primary remains restrained against Slate surfaces;
- light and dark tokens are distinguishable;
- token and style names are visible.

### Task 3: Create the minimal local component set

**Figma changes:**
- Modify page: `Components`
- Create reusable component sets required by the approved screens

- [ ] **Step 1: Create action components**

Build local variants matching shadcn-vue `new-york` dimensions:

```text
Button: default, secondary, outline, ghost, destructive
Button size: default, sm, icon
Badge: default, secondary, outline, destructive
Icon Button: default, ghost
```

Expose label text properties and icon visibility where useful.

- [ ] **Step 2: Create field and navigation components**

Build:

```text
Input: default, focused, disabled
Search field: global, local-tree
Breadcrumb item
Navigation rail item: default, active
Project sidebar item: default, active
Tree item: level 0, level 1, level 2; collapsed and expanded
```

All text properties must accept Russian labels without detaching instances.

- [ ] **Step 3: Create data and feedback components**

Build:

```text
Table header cell
Table body cell
Avatar: initials
Document status badge
Autosave status
Version row
Settings tab
```

- [ ] **Step 4: Create container components**

Build:

```text
Global navigation rail
Project sidebar
Content header
Dialog shell
Card shell
Sticky editor toolbar
```

The global authorized documentation search belongs in `Content header` and represents full-text results already filtered to accessible projects. The project sidebar contains only a compact local field that filters page titles in the current tree.

- [ ] **Step 5: Validate the component page**

Arrange components in labeled sections and screenshot each section.

Expected:

- all instances remain editable through properties;
- components use variables rather than unrelated hardcoded colors;
- no Material visual language appears;
- geometry resembles current shadcn-vue `new-york` examples.

### Task 4: Build the shared desktop shells

**Figma changes:**
- Modify page: `MVP Flow`
- Create frame: `00 Shell / Global`
- Create frame: `00 Shell / Project`

- [ ] **Step 1: Create the global shell**

Create a `1440 × 1024` frame containing:

```text
Global rail: 64 px
Content header: 56 px
Content region: remaining area
```

Use the global authorized documentation search in the center of the content header. Do not include a project sidebar.

- [ ] **Step 2: Create the project shell**

Create a `1440 × 1024` frame containing:

```text
Global rail: 64 px
Project sidebar: 280 px
Content header: 56 px
Content region: remaining area
```

Populate the sidebar with:

```text
Проект «Альфа»
Обзор
Страницы
Создать страницу
Фильтр страниц
realistic three-level page tree
Настройки
```

- [ ] **Step 3: Validate both shells**

Screenshot both frames at a dimension sufficient to inspect text.

Expected:

- the two navigation contexts are visually distinct;
- global authorized documentation search is not duplicated in either sidebar;
- the compact local field that filters page titles is clearly tied to the current tree;
- the content region remains usable.

### Task 5: Build authentication and project-entry screens

**Figma changes:**
- Create frame: `01 Sign in`
- Create frame: `02 Projects`
- Create frame: `03 Project overview`

- [ ] **Step 1: Build `01 Sign in`**

Create a `1440 × 1024` screen with a centered card containing:

```text
Войти в Minerva
Рабочая почта
Пароль
Войти
Русский
Системная тема
```

Do not show public registration or password recovery.

- [ ] **Step 2: Build `02 Projects`**

Use the global shell and create:

- heading `Проекты`;
- description;
- project search;
- status filter;
- `Создать проект` button;
- compact table with five realistic project rows;
- columns for name, description, role, status, and update date.

- [ ] **Step 3: Build `03 Project overview`**

Use the project shell and create:

- project title and description;
- participant avatar summary;
- root-page table/list;
- quick action to create a page;
- short project metadata section.

- [ ] **Step 4: Validate entry screens**

Screenshot all three screens individually.

Expected:

- Russian copy fits;
- the projects table scans quickly;
- the overview is visibly a system page, not an editable document;
- actions are prominent without excessive cards.

### Task 6: Build the document lifecycle screens

**Figma changes:**
- Create frame: `04 Document reading`
- Create frame: `05 Document editor`
- Create frame: `06 Publish dialog`
- Create frame: `07 Version history`

- [ ] **Step 1: Build `04 Document reading`**

Use the project shell and add:

- breadcrumbs;
- `Опубликован` badge and version `v3`;
- `Редактировать`, history, and overflow actions;
- centered `800 px` article column;
- Russian technical-document sample with headings, lists, code, table, and one image placeholder;
- collapsible right-side table of contents shown open.

- [ ] **Step 2: Build `05 Document editor`**

Duplicate the spatial composition of reading mode and replace the document body with editing affordances:

- sticky formatting toolbar;
- `Есть неопубликованные изменения` status;
- `Сохранено` autosave status;
- violet `Опубликовать` action;
- visible editable title and body boundaries without turning the page into a form.

- [ ] **Step 3: Build `06 Publish dialog`**

Present a modal state over the editor:

```text
Опубликовать версию
Описание изменений
Cancel: Отмена
Primary: Опубликовать
```

The change summary field is optional and is labeled accordingly.

- [ ] **Step 4: Build `07 Version history`**

Use the project shell and create a main-area history list with at least four versions. Each row includes:

- version number;
- author avatar and name;
- timestamp;
- change summary;
- `Просмотреть`;
- restore action.

- [ ] **Step 5: Validate document screens**

Screenshot the article column, editor toolbar, publish dialog, and history list separately as well as full screens.

Expected:

- reading and editing preserve the same document position;
- status and save state are unambiguous;
- no toolbar labels are clipped;
- dialog hierarchy is clear;
- history fits in the main area without needing a narrow side panel.

### Task 7: Build project settings

**Figma changes:**
- Create frame: `08 Project settings`

- [ ] **Step 1: Build the settings shell**

Use the project shell with `Настройки` active. Add:

```text
Настройки проекта
Общие
Участники
Роли и разрешения
Аудит
```

- [ ] **Step 2: Populate the Members tab**

Show the `Участники` tab as the active prototype state:

- member search;
- `Пригласить участника`;
- table with user, email, project role, status, and actions;
- a subtle note that project invitations grant no global privileges.

- [ ] **Step 3: Validate project settings**

Screenshot the tabs and member table.

Expected:

- administration remains in one screen;
- the sidebar contains one settings destination;
- tab labels fit in Russian;
- the table uses the same density as Projects.

### Task 8: Arrange, connect, and audit the full prototype

**Figma changes:**
- Modify page: `MVP Flow`
- Connect the eight screens
- Add review annotations

- [ ] **Step 1: Arrange screens**

Place the eight numbered frames left to right with `200 px` gaps:

```text
01 Sign in
02 Projects
03 Project overview
04 Document reading
05 Document editor
06 Publish dialog
07 Version history
08 Project settings
```

Place shell references above the flow, not between numbered screens.

- [ ] **Step 2: Add prototype interactions**

Connect:

```text
Войти → 02 Projects
project row → 03 Project overview
root page/tree item → 04 Document reading
Редактировать → 05 Document editor
Опубликовать → 06 Publish dialog
dialog primary action → 04 Document reading
История → 07 Version history
Настройки → 08 Project settings
```

- [ ] **Step 3: Run structural validation**

Use metadata inspection to verify:

- all eight numbered frames exist;
- each is exactly `1440 × 1024`;
- shared elements are component instances where expected;
- no finished node retains `placeholder = true`;
- layer names are English and visible copy is Russian.

- [ ] **Step 4: Run visual validation**

Capture:

- one screenshot of the full flow;
- one screenshot of each numbered screen;
- close screenshots of the project tree, article, editor toolbar, dialog, history, and settings tabs.

Reject the result if any screenshot contains clipped text, overlapping nodes, blank required content, duplicated global search, inconsistent sidebar widths, or accidental Material styling.

- [ ] **Step 5: Update project documentation**

Modify:

```text
docs/progress.md
docs/superpowers/specs/2026-06-24-minerva-ui-prototype-design.md
```

Record the Figma page names, principal frame node IDs, review status, and any intentionally deferred states.

- [ ] **Step 6: Refresh Tesserae**

Run:

```powershell
$env:PYTHONUTF8='1'
$env:PYTHONIOENCODING='utf-8'
tesserae refresh
```

If the documented Windows `WinError 183` occurs, remove only generated `.tesserae/graph.json` and `.tesserae/code-graph.json`, then rerun.

- [ ] **Step 7: Commit documentation**

Run:

```powershell
git add docs/progress.md docs/superpowers/specs/2026-06-24-minerva-ui-prototype-design.md
git commit -m "docs: record Minerva Figma prototype"
```

Expected: Figma contains the reviewed prototype, repository changes contain documentation only, and application implementation remains blocked pending final user approval.
