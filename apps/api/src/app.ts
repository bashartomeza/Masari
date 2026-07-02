import express from "express";
import { authRouter } from "./modules/auth.js";
import { demoRouter } from "./modules/demoReset.js";
import { errorHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/api/v1/health", (_req, res) => {
    res.json({ ok: true, service: "masari-api" });
  });

  app.use("/api/v1", authRouter);
  app.use("/api/v1", demoRouter);

  app.use(errorHandler);

  return app;
}
