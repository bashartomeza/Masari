# Dependency security remediation

Masari keeps Prisma, `@prisma/client`, and `@prisma/adapter-mariadb` aligned at
7.9.1. Those packages currently pin vulnerable transitive releases: the
adapter pins `mariadb` 3.4.5, Prisma pins `mysql2` 3.15.3, and Prisma's local
tooling reaches `fast-uri` through AJV. Express and its body-parser dependency
reach `qs` 6.15.3.

The root overrides select the smallest upstream releases that contain the
published fixes while remaining in the consumers' compatible ranges:

- `mariadb` 3.4.7 fixes the 3.4.x advisory range while the adapter has not yet
  published a release that updates its exact 3.4.5 dependency.
- `mysql2` 3.23.1 fixes both Prisma-pinned advisories (including the
  decompression issue fixed after 3.23.0) without downgrading Prisma.
- `fast-uri` 3.1.6 fixes the AJV-supported 3.x advisory range.
- `qs` 6.16.0 fixes the Express/body-parser-supported 6.x advisory range.

These are compatibility bridges, not audit exceptions. The existing
`deepmerge-ts` 8.0.1 override remains unchanged for the Prisma 7.9.1 config
consumer. Remove an override only after the owning upstream package publishes
the fixed dependency and the complete API, Admin, Mobile, MySQL, and security
gates pass again.
