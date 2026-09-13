// Prints a one-time invite link. Used to create the first admin, before anyone can
// sign in to the admin page. Mirrors createInvite() in lib/invites.ts.
//
// Run: npm run invite -- admin "Kit"
//      npm run invite -- member "Mom"
import crypto from "node:crypto";
import pg from "pg";

const [role = "member", note = null] = process.argv.slice(2);
if (!["member", "admin"].includes(role)) {
  console.error('role must be "member" or "admin"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (expected in .env.local or .env)");
  process.exit(1);
}

const token = crypto.randomBytes(24).toString("base64url");
const hash = crypto.createHash("sha256").update(token).digest("hex");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(
    `INSERT INTO invites (token_hash, role, note, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(days => 7))`,
    [hash, role, note],
  );
} finally {
  await client.end();
}

const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
console.log(`${role} invite${note ? ` for ${note}` : ""} (expires in 7 days, works once):`);
console.log(`${base}/invite/${token}`);
