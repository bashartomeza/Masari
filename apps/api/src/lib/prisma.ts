import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../config.js";

const adapter = new PrismaPg({
  connectionString: config.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/masari?schema=public"
});

export const prisma = new PrismaClient({ adapter });
