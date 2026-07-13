import express from "express";
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
import { localDevCors } from "./middleware/cors.js";
import { errorHandler } from "./middleware/error.js";
import { config, type AppConfig } from "./config.js";

export function createApp(appConfig: AppConfig = config) {
  const app = express();

  app.use(localDevCors);
  app.use(express.json());

  app.get("/api/v1/health", (_req, res) => {
    res.json({ ok: true, service: "masari-api" });
  });

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

  app.use(errorHandler);

  return app;
}
