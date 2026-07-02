import express from "express";
import { authRouter } from "./modules/auth.js";
import { demoRouter } from "./modules/demoReset.js";
import { passengerRouter } from "./modules/passenger.js";
import { driverRouter } from "./modules/driver.js";
import { merchantRouter } from "./modules/merchant.js";
import { adminRouter } from "./modules/admin.js";
import { errorHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/api/v1/health", (_req, res) => {
    res.json({ ok: true, service: "masari-api" });
  });

  app.use("/api/v1", authRouter);
  app.use("/api/v1", demoRouter);
  app.use("/api/v1", passengerRouter);
  app.use("/api/v1", driverRouter);
  app.use("/api/v1", merchantRouter);
  app.use("/api/v1", adminRouter);

  app.use(errorHandler);

  return app;
}
