/* ============================================================
   Nexora.Find — Database layer (Postgres via pg)
   Lazy pool + one-time schema bootstrap. Works with Neon,
   Supabase, or any Postgres reachable via DATABASE_URL.
   ============================================================ */

import pg from "pg";

const { Pool } = pg;

let pool = null;
let schemaReady = null;

export function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — order storage is not configured.");
  }
  const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(url);
  pool = new Pool({
    connectionString: url,
    // Hosted Postgres (Neon/Supabase) requires TLS; local dev does not.
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000
  });
  pool.on("error", (err) => console.error("pg pool idle error:", err.message));
  return pool;
}

export async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const p = getPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id             BIGSERIAL PRIMARY KEY,
        order_code     TEXT NOT NULL UNIQUE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        status         TEXT NOT NULL DEFAULT 'pending',
        customer       JSONB NOT NULL,
        shipping       JSONB NOT NULL,
        items          JSONB NOT NULL,
        payment_method TEXT NOT NULL,
        subtotal       INTEGER NOT NULL,
        shipping_fee   INTEGER NOT NULL DEFAULT 0,
        total          INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
      CREATE INDEX IF NOT EXISTS orders_status_idx     ON orders (status);
    `);
  })().catch((err) => {
    schemaReady = null; // allow retry on next invocation
    throw err;
  });
  return schemaReady;
}
