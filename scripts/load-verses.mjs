// Reloads the `verses` search table from data/scriptures/ in one transaction, so
// search never sees a half-loaded table. Safe to re-run.
//
// Run: npm run db:migrate   (builds the data, migrates, then runs this)
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data", "scriptures");
const EXPECTED = 41995;
const CHUNK = 5000;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (expected in .env.local or .env)");
  process.exit(1);
}
if (!fs.existsSync(path.join(DATA, "index.json"))) {
  console.error("data/scriptures/ is missing — run `npm run build:data` first");
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(path.join(DATA, "index.json"), "utf8"));
const rows = [];
for (const volume of index.volumes) {
  for (const book of volume.books) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      const chapter = JSON.parse(fs.readFileSync(path.join(DATA, volume.slug, book.slug, `${ch}.json`), "utf8"));
      for (const v of chapter.verses) {
        rows.push([v.id, volume.slug, book.slug, ch, v.verse, rows.length, `${chapter.reference}:${v.verse}`, v.text]);
      }
    }
  }
}
if (rows.length !== EXPECTED) {
  console.error(`expected ${EXPECTED} verses, found ${rows.length}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("TRUNCATE verses");
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const cols = chunk[0].map((_, c) => chunk.map((r) => r[c]));
    await client.query(
      `INSERT INTO verses (id, volume, book, chapter, verse, sort_order, reference, text)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::smallint[], $5::smallint[], $6::int[], $7::text[], $8::text[])`,
      cols,
    );
  }
  await client.query("COMMIT");
  console.log(`loaded ${rows.length} verses into the search table`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error(`load failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
