import express from "express";
import type { Logger } from "pino";
import { authRouter } from "./modules/auth.js";
import { demoRouter } from "./modules/demoReset.js";
import { passengerRouter } from "./modules/passenger.js";
import { driverRouter } from "./modules/driver.js";
import { merchantRouter } from "./modules/merchant.js";
import { adminRouter } from "./modules/admin.js";
import { matchingRouter } from "./modules/matching.js";
import { batchingRouter } from "./modules/batching.js";
import { comparisonRouter } from "./modules/comparison.js";
import { trackingSimulationRouter, tripsRouter } from "./modules/trips.js";
import { createCors } from "./middleware/cors.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { config, type AppConfig } from "./config.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { createOperationalLogger } from "./lib/logger.js";
import { operationalLogMiddleware } from "./middleware/operationalLog.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { createGlobalRateLimiter, createLoginRateLimiter } from "./middleware/rateLimit.js";
import { createHealthRouter } from "./modules/health.js";
import type { ReadinessCheck } from "./lib/readiness.js";

export const HTTP_JSON_LIMIT = "64kb";
export const HTTP_FORM_LIMIT = "16kb";

type AppDependencies = {
  logger?: Logger;
  readinessCheck?: ReadinessCheck;
};

export function createApp(appConfig: AppConfig = config, dependencies: AppDependencies = {}) {
  const app = express();
  const logger = dependencies.logger ?? createOperationalLogger(appConfig);

  app.disable("x-powered-by");
  app.set("trust proxy", appConfig.trustProxy);
  app.use(requestIdMiddleware);
  app.use(operationalLogMiddleware(logger));
  app.use(securityHeaders(appConfig));
  app.use(createCors(appConfig));
  app.use(express.json({ limit: HTTP_JSON_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: HTTP_FORM_LIMIT }));

  app.use("/api/v1", createHealthRouter(appConfig, dependencies.readinessCheck));
  app.use("/api/v1", createGlobalRateLimiter(appConfig));
  app.use("/api/v1/auth/login", createLoginRateLimiter(appConfig));

  app.use("/api/v1", authRouter);
  if (appConfig.demoFeaturesEnabled) app.use("/api/v1", demoRouter);
  app.use("/api/v1", passengerRouter);
  app.use("/api/v1", driverRouter);
  app.use("/api/v1", batchingRouter);
  app.use("/api/v1", merchantRouter);
  app.use("/api/v1", matchingRouter);
  app.use("/api/v1", tripsRouter);
  if (appConfig.demoFeaturesEnabled) {
    app.use("/api/v1", trackingSimulationRouter);
    app.use("/api/v1", comparisonRouter);
  }
  app.use("/api/v1", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
