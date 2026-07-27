# M7C3B accessibility and responsive behavior

The canonical offer and assignment screens use localized Material controls,
directional layout, scrollable content, and minimum platform touch targets.

Validated coverage includes:

- Arabic RTL and English LTR route/stop labels.
- 200% text on a representative small portrait display without clipped primary
  actions.
- Semantic button, selected-state, status, route, demand-type, and live-region
  announcements.
- Pull-to-refresh and visible refresh actions with no gesture-only operation.
- System, gesture, and AppBar back behavior.
- A dirty rejection-reason warning before leaving an unsubmitted choice.
- Foreground and rotation-safe reloads guarded by request-generation fencing.

TalkBack must announce the offer status, route, request type, expiry, rejection
choices, uncertain recovery notice, assignment state, and no-tracking boundary.
No countdown timer or continuously updating live region is used.

