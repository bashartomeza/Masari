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
- Loading, empty, error, selected, disabled, success, and lifecycle states are visibly distinct.

## Accessibility and localization

Arabic is the default application locale and the route module follows the shell's `dir=rtl`; English follows `dir=ltr`. Arabic/English inputs set their own writing direction. Controls use semantic forms, labels, buttons, details/summary, ordered lists, status regions, and visible focus outlines.

The two-column catalog/workspace becomes one column below 880 px; form and permission grids collapse on smaller screens. Shared CSS tokens define spacing, radii, surfaces, brand, status, and focus colors without redesigning unrelated screens.

## Explicit exclusions

There is no map SDK, geocoder, provider token, GPS surface, live location, realtime transport, pricing, bulk import, recurring schedule, driver route selector, or passenger/merchant route selector. The module does not import or expose demo reset/simulation controls.
