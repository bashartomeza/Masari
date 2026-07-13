# Branch and release policy

The PostgreSQL and MySQL hackathon tags are immutable fallbacks. Do not move or recreate `v0.1.0-hackathon` or `v0.2.0-hackathon-mysql`. Production-readiness work remains on `production-readiness` until reviewed.

No Git remote is currently configured. After the team leader creates a private GitHub repository and supplies its exact approved URL, an operator may run:

```powershell
git remote add origin <private-url>
git fetch origin
git log --oneline --decorate --graph --all -20
git push -u origin production-readiness
git push origin v0.1.0-hackathon v0.2.0-hackathon-mysql
```

Before pushing, verify the destination is private and inspect fetched history for conflicts. Never push ignored environments, dumps, release ZIPs, APKs, signing keys, or credentials. A new release tag requires explicit approval and successful release-candidate validation; M6B2 creates no release tag.

Use focused commits, review schema/migration changes separately, and generate safe release metadata with `npm run release:metadata`. Build artifacts and generated metadata remain ignored unless the team leader explicitly approves packaging.
