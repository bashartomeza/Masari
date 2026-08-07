import { sha256, validateNormalizedRouteResult, type NormalizedRouteResult, type RouteCalculationInput } from "./contracts.js";

type Entry = { expiresAt: number; integrity: string; value: NormalizedRouteResult };

export class RoutePreviewCache {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly ttlMs: number, private readonly now = () => Date.now()) {}

  key(provider: string, input: RouteCalculationInput) {
    return sha256({ provider, input });
  }

  get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    try {
      if (entry.integrity !== sha256(entry.value)) throw new Error("cache integrity mismatch");
      return validateNormalizedRouteResult(entry.value);
    } catch {
      this.entries.delete(key);
      return undefined;
    }
  }

  set(key: string, value: NormalizedRouteResult) {
    if (this.ttlMs <= 0) return;
    const validated = validateNormalizedRouteResult(value);
    this.entries.set(key, { expiresAt: this.now() + this.ttlMs, integrity: sha256(validated), value: validated });
  }

  clear() {
    this.entries.clear();
  }
}
