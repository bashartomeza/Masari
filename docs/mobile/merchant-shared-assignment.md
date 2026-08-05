# Merchant shared assignment

The existing owner-only merchant assignment endpoint remains the source of truth. The shared Trip discriminator is strict and co-member blind.

For an assigned shared Trip, Flutter shows the merchant's own order and parcel destinations, a neutral shared-assignment indicator, the safe public Trip summary, and the privacy notice. It does not expose passenger data, other orders, member counts, recipient data, descriptions, phones, coordinates, maps, ETA, tracking, pricing, or dispatch controls.

The backend omits shared Trip data when shared mobile assignment presentation is disabled. Cross-owner access remains concealed by the API. Unknown Trip status or vehicle values render localized safe fallback wording instead of internal enum text.
