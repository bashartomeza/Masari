# Release metadata and checksums

Generate safe JSON metadata with:

```powershell
npm run release:metadata -- -- --release <immutable-release-id> --environment staging --output release/metadata.json
```

Optional artifact flags are `--api`, `--admin`, and `--mobile`; each accepts a file and records its filename and SHA-256. The metadata records Git commit/branch, release, environment type, build date, canonical Node/Flutter/Java versions, and migration names/checksums.

The second `--` preserves named arguments with npm 10 on Windows; direct `node scripts/release-metadata.mjs ...` invocation is equivalent.

For reproducible output, set `SOURCE_DATE_EPOCH` to the approved build timestamp. Identical inputs then produce identical metadata. The schema deliberately has no database URL, JWT/reset secret, demo password, or host credential field. Generated release output remains ignored.
