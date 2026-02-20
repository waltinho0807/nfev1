import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL || "";
const hasSslDisable = databaseUrl.includes("sslmode=disable");
const forceSSL = process.env.DATABASE_SSL === "true";

const useSSL = forceSSL || (!hasSslDisable && !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1") && databaseUrl.length > 0);

const pool = new Pool({
  connectionString: databaseUrl,
  ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool, { schema });
