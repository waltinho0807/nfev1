import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import dns from "dns";
import net from "net";

dns.setDefaultResultOrder("ipv4first");

const databaseUrl = process.env.DATABASE_URL || "";
const hasSslDisable = databaseUrl.includes("sslmode=disable");
const forceSSL = process.env.DATABASE_SSL === "true";

const useSSL = forceSSL || (!hasSslDisable && !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1") && databaseUrl.length > 0);

const pool = new Pool({
  connectionString: databaseUrl,
  ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args: any[]) {
  const options = args[0];
  if (typeof options === "object" && options !== null && !options.family) {
    options.family = 4;
  }
  return originalConnect.apply(this, args as any);
};

export const db = drizzle(pool, { schema });
