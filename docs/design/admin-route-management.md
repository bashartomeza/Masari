# Admin route-management design

The M7B admin module is separate from the judge demo console and appears only when `VITE_ROUTE_MANAGEMENT_ENABLED=true`.

## Information architecture

- A production navigation strip separates overview/demo content from route management.
- The left catalog provides search, lifecycle filter, bounded pagination, and selected-route state.
- The main workspace contains stable identity, version tabs, bilingual draft fields, active dates, lifecycle actions, ordered stop editor, and canonical stop creation/retirement.
- Geometry is an explicit readiness badge; there is no map placeholder or fake preview.

## Interaction rules

- Published fields render read-only. Correction begins with clone-to-draft.
- Stop order uses labeled up/down buttons and contiguous numbering; no drag-only interaction is required.
- Permission flags use native labeled checkboxes.
- Publication, pause, resume, version retirement, route retirement, and stop retirement require confirmation.
- A stale revision produces a localized reload-before-save message.
- Creation and lifecycle mutations retain one idempotency key for the same logical payload after a network failure, server error, or in-progress response. A successful or authoritative client-error outcome retires that key; an edited payload receives a new key.
- A synchronous ref-backed mutation guard closes the same-render double-click window. Mutation and navigation controls remain disabled until the current operation settles.
- Unknown API and transport failures use a localized generic message rather than rendering raw backend text. The explicit draft-revision conflict remains localized and actionable.
- Loading, empty, error, selected, disabled, success, and lifecycle states are visibly distinct.

## Accessibility and localization

Independent browser review exercised the production admin at desktop, `768 x 1024`, and `390 x 844`, plus 200% browser scaling with long Arabic content. The responsive route layout remained a single stacked column at tablet/narrow widths, retained a static sidebar, and produced no horizontal overflow. Arabic remained RTL, English remained LTR, keyboard stop reordering remained operable, and the active control exposed a visible focus indicator.

Arabic is the default application locale and the route module follows the shell's `dir=rtl`; English follows `dir=ltr`. Arabic/English inputs set their own writing direction. Controls use semantic forms, labels, buttons, details/summary, ordered lists, status regions, and visible focus outlines.

The two-column catalog/workspace becomes one column below 880 px; form and permission grids collapse on smaller screens. Shared CSS tokens define spacing, radii, surfaces, brand, status, and focus colors without redesigning unrelated screens.

## Explicit exclusions

There is no map SDK, geocoder, provider token, GPS surface, live location, realtime transport, pricing, bulk import, recurring schedule, driver route selector, or passenger/merchant route selector. The module does not import or expose demo reset/simulation controls.
