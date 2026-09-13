import { Pool } from "pg";

// One pool per server process. In dev, hot reloads re-run this module, so the pool
// is parked on globalThis instead of leaking a new one per reload.
const globalForPool = globalThis as unknown as { pgPool?: Pool };

export const pool = globalForPool.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

if (process.env.NODE_ENV !== "production") globalForPool.pgPool = pool;
