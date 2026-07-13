import type { RequestHandler } from "express";
import { config } from "../config.js";

const allowedOrigins = new Set(
  config.corsOrigins
);

export const localDevCors: RequestHandler = (req, res, next) => {
  const origin = req.header("origin");
  if (origin && allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,x-demo-reset-key");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
};
