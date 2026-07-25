# M7C2 localization, accessibility, and responsive behavior

All completed M7C2 copy is generated from Arabic and English ARB files. Arabic is the default RTL locale and English is LTR. Route and stop names select the active locale, wrap naturally, and never expose internal IDs through visible or accessibility labels.

Reusable route cards announce route name, textual direction, button state, and selection. Ordered stops announce their heading, sequence, localized name, and selected state. Lifecycle state is always text, not color alone. Controls use Material minimum touch targets, logical source/focus order, visible platform focus, and semantic labels for route, direction, stop order, capacity, parcel, and operation result.

Screens use scrollable single-column layouts with directional padding and no fixed-width form surface. They are intended for portrait, landscape, small/large Android displays, and 200% text scaling. Long bilingual names use wrapping or ellipsis only inside bounded dropdown rows; full route names remain available on cards and timelines.

Android system, gesture, and app-bar back use the router's existing role-scoped stack. An in-flight request has a synchronous busy fence, so rotation or repeated actions cannot create a second logical operation. No map placeholder, route-line graphic, location permission, or realtime affordance exists.
