import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16).default("development-jwt-secret-change-me"),
  DEMO_RESET_KEY: z.string().min(8).optional(),
  CORS_ORIGINS: z
    .string()
    .default(
      "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175"
    ),
  PORT: z.coerce.number().int().positive().default(3000)
});

export const config = envSchema.parse(process.env);
