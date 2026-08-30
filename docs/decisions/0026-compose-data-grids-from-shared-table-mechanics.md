# ADR 0026: Compose data grids from shared table mechanics

Date: 2026-08-22  
Status: accepted  
Accepted: 2026-08-22

## Context

Administration audit is the first server-paginated table with sortable columns.
Its browser-managed automatic table layout recalculates column widths from each
page of data, so sorting and pagination visibly move columns and change row
heights. Users also need to widen and narrow columns. Future user, project, and
other directory screens will share these interaction mechanics while retaining
different contracts, filters, permissions, cells, and row actions.

An inheritance-based directory base class would couple unrelated domain screens
and hide their data-loading and authorization boundaries. The application
already uses feature-scoped stateless Actions and server-owned business rules.

## Decision

- Reusable tabular mechanics live in a shared `DataGrid` component and pure
  sizing helpers. Domain screens compose the component instead of inheriting
  from a directory base class.
- Each feature owns its column declaration, server query contract, sort
  allow-list, filters, permissions, data loading, cell rendering, and row
  actions.
- `DataGrid` uses the existing TanStack Vue Table dependency for column sizing
  and resize state. Sorting and pagination remain manual and server-owned.
- Every column declares a stable ID and default, minimum, and maximum widths.
  The table uses a fixed layout and horizontal scrolling rather than shrinking
  columns below their declared minimums.
- Screens choose a bounded row presentation. The audit grid uses fixed-height
  rows and truncates long values so different result pages cannot change its
  geometry.
- Column widths are persisted in browser local storage under a versioned,
  grid-specific key. Restored values are treated as untrusted input, limited to
  known column IDs, checked for finite numeric values, and clamped to each
  column boundary. No rows, filters, identifiers, or other domain data are
  stored there.
- Existing `UiTable` primitives remain available for simple static tables.
  Migration to `DataGrid` happens one feature at a time when the interaction
  requirements justify it.

## Consequences

- Sorting and pagination no longer cause column-width jumps in migrated grids.
- Users can resize columns without changing shared or domain configuration.
- New directory screens reuse interaction behavior while keeping explicit
  feature and authorization boundaries.
- A domain screen still supplies its table body, so specialized badges,
  navigation, and actions do not accumulate conditionals in the shared grid.
- Column preference synchronization between devices is deferred; browser-local
  persistence is sufficient for the initial slice.

## Alternatives rejected

- **A base directory class:** Vue composition and explicit feature capabilities
  are clearer than inheritance across domains with different policies.
- **Change the global `UiTable`:** simple content tables should not acquire
  resizing state, persistence, or fixed-layout behavior.
- **Client-side sorting and pagination:** the audit result set is server-owned
  and authorization-filtered, so sorting only the loaded page would be
  misleading.

