# Minerva MVP UX/UI prototype design

Status: awaiting user review  
Date: 2026-06-24  
Target: [Minerva Figma file](https://www.figma.com/design/zRIOKJjqh8RiQt20IhZWZP/%D0%9C%D0%B8%D0%BD%D0%B5%D1%80%D0%B2%D0%B0?node-id=1-30&m=dev)

## Purpose

The first Figma iteration validates Minerva's desktop information architecture and primary documentation workflow before application implementation begins. It is a structural prototype, not a complete catalogue of every state in the product specification.

The prototype uses official shadcn-vue visual conventions so that the approved screens can later be implemented with minimal translation into Nuxt and shadcn-vue components.

## Evaluated approaches

### Selected: Confluence-like information architecture with shadcn-vue presentation

Use a narrow global navigation rail, a contextual project sidebar, and a spacious content area. This preserves project and document context without mixing global administration into the page tree.

Use the shadcn-vue `new-york` component geometry, Slate semantic surfaces, a restrained violet primary color, and Lucide icons. Do not introduce a separate decorative visual language.

### Rejected: one combined sidebar

A single sidebar is more compact but mixes global destinations, project operations, and the document tree. It becomes difficult to scan as project administration grows.

### Rejected: header-only global navigation

This gives documents more width but makes project switching, administration, and persistent context less discoverable.

## Desktop application shell

The reference desktop frame is `1440 × 1024`.

### Global navigation rail

- Width: approximately `64 px`.
- Contains the Minerva mark and the Projects destination.
- The bottom area contains Administration when authorized, locale/theme controls, and the profile menu.
- Global search is not placed in this rail.
- The active destination uses the violet primary treatment.

### Project sidebar

- Width: approximately `280 px`.
- Header contains the current project and a project switcher.
- Primary destinations are Overview and Pages.
- A visible create-page action is shown only when authorized.
- A compact local field filters titles in the current document tree; it does not perform full-text search.
- The ordered document tree occupies the scrollable middle area.
- A single Project settings destination appears at the bottom when authorized.

### Content header

- Breadcrumbs and the sidebar trigger appear on the left.
- Global authorized documentation search occupies the central header area and opens a shadcn `Command` dialog.
- Page-specific actions appear on the right.
- Profile, locale, and theme remain available from the global rail rather than being duplicated.

### Responsive behavior

- Both desktop navigation areas can collapse.
- At narrower desktop and tablet widths, the project sidebar becomes a drawer.
- The first prototype validates desktop composition; detailed mobile screens are deferred.

## Visual system

- Component style: shadcn-vue `new-york`.
- Neutral foundation: Slate semantic tokens.
- Primary: restrained violet for primary actions, active navigation, links where appropriate, focus rings, and selected states.
- Icons: Lucide.
- Typography and spacing follow shadcn-vue examples rather than a custom marketing system.
- Tables use compact density; document content uses generous vertical rhythm.
- Light and dark themes share semantic token names.
- The first prototype contains no decorative illustrations or stock photography.

## Prototype screens

### 1. Sign in

A centered shadcn card contains email, password, sign-in action, locale selection, and theme control. Public registration and unplanned password-recovery UI are absent.

### 2. Projects

The post-login landing screen is a searchable table of accessible projects. Columns include project name, short description, the user's role, lifecycle status, and last update. Authorized users see the create-project action.

This screen uses the global rail and content header but no project sidebar.

### 3. Project overview

Opening a project first displays a system overview rather than an ordinary document. It contains the project name and description, participant summary, root pages, and permission-aware quick actions. The full document tree is already visible in the project sidebar.

### 4. Document reading

Documents open in reading mode by default. The main article column is approximately `760–820 px` wide and centered in the available content area. The header shows breadcrumbs, publication state, version, and permission-aware actions.

The reading prototype shows a collapsible right-side table of contents for a document with several headings. It is closed by default when no useful outline exists. Wide tables may use additional available width without making normal prose full-width.

### 5. Document editor

Editing is an explicit mode. It preserves the reading layout and adds a sticky formatting toolbar above the document. The toolbar supports the editor features defined by the product specification.

The header shows draft state, save state, and the publish action. Autosave states are:

- Saving;
- Saved;
- Edit conflict.

The prototype shows the normal saved state. Conflict resolution is designed in the later full-MVP screen pass.

### 6. Publish dialog

A shadcn dialog requires a change summary before publishing. The primary action creates the immutable version; cancel returns to the editor.

### 7. Version history

History occupies the main content area. Each version shows its number, author, timestamp, change summary, and restore action. Restore requires confirmation and creates a new draft rather than changing history.

### 8. Project settings

One full-width settings screen uses tabs:

- General;
- Members;
- Roles and permissions;
- Audit.

The project sidebar contains one Settings destination rather than separate links for each administrative section. Tabs and actions are permission-aware.

## Document-state behavior

The document header always exposes one clear state:

- Published;
- Draft;
- Unpublished changes.

The state is accompanied by version and save information where relevant. Separate Draft and Published tabs are not used.

Viewers do not see enabled mutation controls. The UI reflects permissions returned by the server; it never acts as the authorization boundary.

## Primary prototype flow

The connected path is:

`Sign in → Projects → Project overview → Document reading → Document editor → Publish dialog → Version history → Project settings`

The flow validates the shell, project context, document lifecycle, and the entry point into project administration.

## Component mapping

The prototype should map directly to shadcn-vue primitives and compositions:

- `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarTrigger`;
- `Button`, `Input`, `Table`, `Badge`;
- `Breadcrumb`, `DropdownMenu`, `Tooltip`;
- `Command` and `CommandDialog` for global search;
- `Dialog` and `AlertDialog` for publish and restore confirmation;
- `Tabs` for project settings;
- `ScrollArea`, `Separator`, and `Collapsible` for the document tree;
- `Card` for sign-in and limited overview summaries;
- `Avatar` for members.

If the Figma file has no compatible published shadcn library, the prototype should create reusable local representations of only the components needed for these eight screens. Their dimensions and states must match the current shadcn-vue `new-york` examples.

## Prototype organization in Figma

- Preserve the supplied Figma file.
- Replace or move beyond the current empty frame without overwriting unrelated future work.
- Create a `Foundations` page for semantic colors, typography, spacing notes, and component references.
- Create a `Components` page for the minimal reusable prototype set.
- Create an `MVP Flow` page containing the eight numbered desktop screens from left to right.
- Use auto layout throughout and name frames and sections consistently in English; visible product copy is Russian by default.
- Link primary actions between the eight screens for prototype playback.

## Validation criteria

The first Figma iteration is ready for review when:

- all eight screens use one consistent shell;
- the project tree remains understandable at realistic depth;
- global search and local tree filtering are visually distinct;
- reading and editing modes are clearly distinguishable without changing the document's spatial position;
- publication state and autosave state are visible;
- project administration fits without expanding the sidebar;
- Russian copy fits without clipping;
- component dimensions remain compatible with shadcn-vue `new-york`;
- the connected primary flow can be followed in prototype order.

## Explicitly deferred

- Mobile-specific screens;
- every empty, loading, error, and permission state;
- autosave conflict resolution UI;
- complete search result views;
- invitation acceptance and account bootstrap screens;
- detailed role-matrix interactions;
- OAuth grant management and MCP connection screens;
- complete dark-theme screen duplicates;
- production-ready component library and Code Connect mappings.
