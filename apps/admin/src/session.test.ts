import { describe, expect, it } from "vitest";
import { ADMIN_TOKEN_KEY, clearAdminSession } from "./App";

function storage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
}

describe("admin interim session storage", () => {
  it("logout clears current sessionStorage and legacy localStorage tokens", () => {
    const session = storage({ [ADMIN_TOKEN_KEY]: "session-token" });
    const legacy = storage({ [ADMIN_TOKEN_KEY]: "legacy-token" });
    clearAdminSession(session, legacy);
    expect(session.getItem(ADMIN_TOKEN_KEY)).toBeNull();
    expect(legacy.getItem(ADMIN_TOKEN_KEY)).toBeNull();
  });
});
