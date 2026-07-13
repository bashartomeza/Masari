import { prisma } from "./prisma.js";

export type ReadinessCheck = () => Promise<void>;

export const checkDatabaseReadiness: ReadinessCheck = async () => {
  await prisma.$queryRawUnsafe("SELECT 1");
};

export async function runWithTimeout(check: ReadinessCheck, timeoutMs: number) {
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      check(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("readiness_timeout")), timeoutMs);
        timeout.unref();
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
