import { createApp } from "./app.js";
import { config } from "./config.js";
import { createOperationalLogger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

const logger = createOperationalLogger(config);
const app = createApp(config, { logger });
let shuttingDown = false;

const server = app.listen(config.port, () => {
  logger.info({ event: "api_started", port: config.port }, "Masari API started");
});

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ event: "shutdown_started", signal }, "Masari API shutdown started");

  const forcedExit = setTimeout(() => {
    logger.error({ event: "shutdown_timeout" }, "Masari API shutdown timed out");
    logger.flush();
    process.exit(1);
  }, 10_000);
  forcedExit.unref();

  server.close(async (serverError) => {
    try {
      if (serverError) throw serverError;
      await prisma.$disconnect();
      logger.info({ event: "shutdown_completed" }, "Masari API shutdown completed");
    } catch (error) {
      logger.error(
        { event: "shutdown_failed", error_type: error instanceof Error ? error.name : "UnknownError" },
        "Masari API shutdown failed"
      );
      process.exitCode = 1;
    } finally {
      clearTimeout(forcedExit);
      logger.flush();
    }
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
