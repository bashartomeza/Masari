import { fileURLToPath } from "node:url";

const DISPOSABLE_DATABASE = /^masari_auth_rehearsal_[a-z0-9_]+$/;

export function assertDisposableDatabase(name) {
  if (!DISPOSABLE_DATABASE.test(name)) {
    throw new Error("disposable_database_required");
  }
}

export async function runAuthMigrationRehearsal({ database }) {
  assertDisposableDatabase(database);
}

function databaseName(databaseUrl) {
  if (!databaseUrl) return "";
  return new URL(databaseUrl).pathname.slice(1);
}

async function main() {
  await runAuthMigrationRehearsal({ database: databaseName(process.env.DATABASE_URL) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "disposable_database_required");
    process.exitCode = 1;
  });
}
