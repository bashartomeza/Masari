import { HttpError } from "../middleware/error.js";

/**
 * Server-side proxy for the checkpoint/barrier feed.
 *
 * The upstream is a Supabase PostgREST table. The app never talks to it
 * directly: the key would ship inside the APK, and the mobile client would gain
 * a second network origin outside the session boundary. Keeping the call here
 * means the key lives in server config and the app sees one authenticated API.
 *
 * Nothing here invents a barrier. When the upstream fails and no cached read is
 * available the router answers 503 so the map can say so, because a barrier
 * drawn in the wrong place is worse than a barrier not drawn at all.
 */

export type CheckpointStatus = "open" | "congested" | "closed" | "unknown";

export type Checkpoint = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  latitude: number;
  longitude: number;
  status: CheckpointStatus;
  updated_at: string | null;
};

export type CheckpointReadResult = {
  checkpoints: Checkpoint[];
  fetched_at: string;
  stale: boolean;
};

export type CheckpointServiceConfig = {
  url: string;
  apiKey: string;
  timeoutMs: number;
  cacheTtlSeconds: number;
};

/**
 * The upstream table is owned by another team and its column names are not
 * pinned by a contract we control, so each field accepts the spellings seen in
 * the wild. A row that still has no usable coordinate is dropped rather than
 * guessed at — see `normalizeRow`.
 */
const ID_KEYS = ["id", "checkpoint_id", "uuid"] as const;
const NAME_AR_KEYS = ["name_ar", "ar_name", "title_ar", "label_ar"] as const;
const NAME_EN_KEYS = ["name_en", "en_name", "title_en", "label_en", "name"] as const;
const LAT_KEYS = ["latitude", "lat"] as const;
const LNG_KEYS = ["longitude", "lng", "lon", "long"] as const;
const STATUS_KEYS = ["status", "state", "condition"] as const;
const UPDATED_KEYS = ["updated_at", "last_updated", "modified_at", "created_at"] as const;

const CLOSED_MARKERS = ["closed", "blocked", "shut", "مغلق", "مغلقة"];
const CONGESTED_MARKERS = ["congested", "busy", "slow", "delay", "crowded", "ازدحام", "مزدحم"];
const OPEN_MARKERS = ["open", "clear", "flowing", "مفتوح", "مفتوحة", "سالك"];

function pick(row: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function toCoordinate(value: unknown, limit: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || Math.abs(numeric) > limit) return null;
  // Six decimals matches the catalog's stop precision (~0.1 m).
  return Number(numeric.toFixed(6));
}

function toStatus(value: unknown): CheckpointStatus {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  if (CLOSED_MARKERS.some((marker) => normalized.includes(marker))) return "closed";
  if (CONGESTED_MARKERS.some((marker) => normalized.includes(marker))) return "congested";
  if (OPEN_MARKERS.some((marker) => normalized.includes(marker))) return "open";
  return "unknown";
}

function toText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed.normalize("NFC");
}

function toTimestamp(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeRow(row: unknown, index: number): Checkpoint | null {
  if (typeof row !== "object" || row === null || Array.isArray(row)) return null;
  const record = row as Record<string, unknown>;
  const latitude = toCoordinate(pick(record, LAT_KEYS), 90);
  const longitude = toCoordinate(pick(record, LNG_KEYS), 180);
  // A barrier without a position cannot be placed on the map, and placing it
  // anywhere else would be fabrication. Drop it.
  if (latitude === null || longitude === null) return null;
  const rawId = pick(record, ID_KEYS);
  const nameAr = toText(pick(record, NAME_AR_KEYS));
  const nameEn = toText(pick(record, NAME_EN_KEYS));
  return {
    id: rawId === undefined ? `checkpoint_${index}` : String(rawId),
    name_ar: nameAr,
    name_en: nameEn,
    latitude,
    longitude,
    status: toStatus(pick(record, STATUS_KEYS)),
    updated_at: toTimestamp(pick(record, UPDATED_KEYS))
  };
}

export class CheckpointService {
  constructor(private readonly config: CheckpointServiceConfig) {}

  private cache: { result: CheckpointReadResult; expiresAt: number } | null = null;

  async list(): Promise<CheckpointReadResult> {
    const now = Date.now();
    if (this.cache && now < this.cache.expiresAt) {
      return this.cache.result;
    }
    try {
      const checkpoints = await this.fetchUpstream();
      const result: CheckpointReadResult = {
        checkpoints,
        fetched_at: new Date().toISOString(),
        stale: false
      };
      this.cache = { result, expiresAt: now + this.config.cacheTtlSeconds * 1_000 };
      return result;
    } catch (error) {
      // A recent-but-expired read beats a blank map during a brief upstream
      // wobble, and the flag lets the client label it honestly.
      if (this.cache) {
        return { ...this.cache.result, stale: true };
      }
      throw error;
    }
  }

  private async fetchUpstream(): Promise<Checkpoint[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let response: Response;
    try {
      const url = new URL(this.config.url);
      if (!url.searchParams.has("select")) url.searchParams.set("select", "*");
      response = await fetch(url, {
        headers: {
          apikey: this.config.apiKey,
          authorization: `Bearer ${this.config.apiKey}`,
          accept: "application/json"
        },
        signal: controller.signal
      });
    } catch {
      // Upstream hostname, key, and error body stay server-side.
      throw new HttpError(503, "checkpoints_upstream_unreachable");
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // 401/403 here means the upstream grant is missing, which is an
      // operational problem for us, not a client error — hence 503 either way.
      throw new HttpError(503, "checkpoints_upstream_rejected");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new HttpError(502, "checkpoints_upstream_invalid");
    }
    if (!Array.isArray(payload)) {
      throw new HttpError(502, "checkpoints_upstream_invalid");
    }
    return payload
      .map((row, index) => normalizeRow(row, index))
      .filter((checkpoint): checkpoint is Checkpoint => checkpoint !== null);
  }
}

export function createCheckpointService(config: CheckpointServiceConfig) {
  return new CheckpointService(config);
}
