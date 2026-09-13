// Applies migrations/*.sql in filename order, each in its own transaction, and
// records them in schema_migrations. Already-applied files are skipped.
//
// Run: npm run db:migrate   (runs better-auth's migrate first, then this)
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "migrations");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (expected in .env.local or .env)");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const { rows } = await client.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    await client.query("BEGIN");
    try {
      await client.query(fs.readFileSync(path.join(DIR, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
      count++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`failed ${file}: ${err.message}`);
      process.exitCode = 1;
      break;
    }
  }
  if (count === 0 && !process.exitCode) console.log("no pending migrations");
} finally {
  await client.end();
}
