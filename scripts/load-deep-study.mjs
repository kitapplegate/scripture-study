// Reloads the `ds_passages` search table from data/deep-study/ in one transaction,
// so Deep Study search never sees a half-loaded table. Safe to re-run.
//
// Run: npm run db:migrate   (builds the data, migrates, then runs this)
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data", "deep-study");
const CHUNK = 2000;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (expected in .env.local or .env)");
  process.exit(1);
}
if (!fs.existsSync(path.join(DATA, "index.json"))) {
  console.error("data/deep-study/ is missing — run `npm run build:data` first");
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(path.join(DATA, "index.json"), "utf8"));
const rows = [];
for (const source of index.sources) {
  const { passages } = JSON.parse(fs.readFileSync(path.join(DATA, `${source.slug}.json`), "utf8"));
  passages.forEach((p, i) => rows.push([p.id, source.slug, p.book, p.chapter, p.section, i, p.reference, p.text]));
}
const expected = index.sources.reduce((n, s) => n + s.passages, 0);
if (rows.length !== expected) {
  console.error(`expected ${expected} passages, found ${rows.length}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("TRUNCATE ds_passages");
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const cols = chunk[0].map((_, c) => chunk.map((r) => r[c]));
    await client.query(
      `INSERT INTO ds_passages (id, source, book, chapter, section, sort_order, reference, text)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::smallint[], $5::smallint[], $6::int[], $7::text[], $8::text[])`,
      cols,
    );
  }
  await client.query("COMMIT");
  console.log(`loaded ${rows.length} Deep Study passages`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error(`load failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
