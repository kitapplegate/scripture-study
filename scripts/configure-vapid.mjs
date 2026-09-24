// Generate Knit's persistent Web Push identity on first deploy without printing either
// key. A partial configuration is an error: silently rotating one side would invalidate
// every browser subscription.
import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";

const envPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(import.meta.dirname, "..", ".env");
const source = fs.readFileSync(envPath, "utf8");

function value(name) {
  const match = source.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

const publicKey = value("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
const privateKey = value("VAPID_PRIVATE_KEY");
const subject = value("VAPID_SUBJECT");
const present = [publicKey, privateKey, subject].filter(Boolean).length;

if (present === 3) {
  console.log("VAPID keys already configured");
  process.exit(0);
}
if (present !== 0) {
  console.error("VAPID configuration is incomplete; set all three values before deploying");
  process.exit(1);
}

const siteUrl = value("BETTER_AUTH_URL");
if (!siteUrl.startsWith("https://")) {
  console.error("BETTER_AUTH_URL must be an HTTPS URL before VAPID keys can be generated");
  process.exit(1);
}

const generated = webpush.generateVAPIDKeys();
const separator = source.endsWith("\n") ? "" : "\n";
fs.appendFileSync(
  envPath,
  `${separator}\n# Web Push identity (generated once by deploy/deploy.sh)\n` +
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${generated.publicKey}\n` +
    `VAPID_PRIVATE_KEY=${generated.privateKey}\n` +
    `VAPID_SUBJECT=${siteUrl}\n`,
  { encoding: "utf8", mode: 0o600 },
);
fs.chmodSync(envPath, 0o600);
console.log("generated VAPID keys");
