import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../config.js";

const databaseUrl = new URL(config.DATABASE_URL ?? "mysql://user:password@localhost:3306/masari");
const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.replace(/^\//, ""),
  connectionLimit: 5
});

export const prisma = new PrismaClient({ adapter });
