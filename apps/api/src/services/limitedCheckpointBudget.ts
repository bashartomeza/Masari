import { createHash, randomUUID } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { PartnerBudget } from "./limitedCheckpointDirectory.js";

/** Shared database coordination; no new schema and no key stored in the table.
 * A reserved slot lasts the entire request deadline plus 2.1 seconds. A slow
 * caller cannot start after its deadline; successive starts are therefore at
 * least 2.1 seconds apart (strictly below 30 in any rolling minute). This is
 * deliberately conservative. Cache and single-flight normally use far less.
 * expires_at represents the next permitted start, not a stale-cache policy.
 */
export class MysqlPartnerBudget implements PartnerBudget {
  private readonly digest: string;
  constructor(private readonly db: PrismaClient, key: string) {
    this.digest = createHash("sha256").update(key).digest("hex");
  }
  private async locked<T>(action: (now: Date, expires: Date, update: (until: Date) => Promise<void>) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`INSERT INTO abuse_counters
        (id,bucket_type,subject_digest,digest_version,window_start,window_seconds,count,expires_at,created_at,updated_at)
        VALUES (${randomUUID()},'checkpoint_partner_budget',${this.digest},1,'1970-01-01 00:00:00',1,0,'1970-01-01 00:00:00',UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))
        ON DUPLICATE KEY UPDATE id=id`;
      const rows = await tx.$queryRaw<{ expires_at: Date }[]>`SELECT expires_at FROM abuse_counters
        WHERE bucket_type='checkpoint_partner_budget' AND subject_digest=${this.digest} AND digest_version=1
        AND window_start='1970-01-01 00:00:00' AND window_seconds=1 FOR UPDATE`;
      // Separate statement AFTER lock acquisition; never a pre-wait timestamp.
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT UTC_TIMESTAMP(3) AS now`;
      if (!rows[0] || !clock) throw Error("budget_unavailable");
      return action(clock.now, rows[0].expires_at, async until => {
        await tx.$executeRaw`UPDATE abuse_counters SET expires_at=${until}, count=LEAST(count+1,2147483647), updated_at=UTC_TIMESTAMP(3)
          WHERE bucket_type='checkpoint_partner_budget' AND subject_digest=${this.digest} AND digest_version=1
          AND window_start='1970-01-01 00:00:00' AND window_seconds=1`;
      });
    }, { maxWait: 1000, timeout: 2000 });
  }
  reserve(timeoutMs: number): Promise<number> {
    return this.locked(async (now, expires, update) => {
      if (expires > now) return Math.ceil((expires.getTime() - now.getTime()) / 1000);
      await update(new Date(now.getTime() + timeoutMs + 2100));
      return 0;
    });
  }
  defer(seconds: number): Promise<void> {
    return this.locked(async (now, expires, update) => {
      const until = seconds === Infinity ? new Date("9999-12-31T00:00:00.000Z") : new Date(now.getTime() + seconds * 1000);
      await update(new Date(Math.max(expires.getTime(), until.getTime())));
    });
  }
}
