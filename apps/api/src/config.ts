import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16).default("development-jwt-secret-change-me"),
  DEMO_RESET_KEY: z.string().min(8).optional(),
  PORT: z.coerce.number().int().positive().default(3000)
});

export const config = envSchema.parse(process.env);
