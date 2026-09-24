import webpush from "web-push";
import { pool } from "./db";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

function vapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function publicVapidKey() {
  return vapidConfig()?.publicKey ?? null;
}

export async function savePushSubscription(userId: string, subscription: StoredPushSubscription) {
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           updated_at = now()`,
    [userId, subscription.endpoint, subscription.p256dh, subscription.auth],
  );
}

export async function removePushSubscription(userId: string, endpoint: string) {
  const { rowCount } = await pool.query(
    "DELETE FROM push_subscriptions WHERE user_id = $1::text AND endpoint = $2::text",
    [userId, endpoint],
  );
  return rowCount === 1;
}

export async function subscriptionsForNewPost(authorId: string) {
  const { rows } = await pool.query<StoredPushSubscription>(
    `SELECT endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE user_id <> $1::text`,
    [authorId],
  );
  return rows;
}

export async function subscriptionsForPostAuthor(postId: string, commenterId: string) {
  const { rows } = await pool.query<StoredPushSubscription>(
    `SELECT s.endpoint, s.p256dh, s.auth
     FROM push_subscriptions s
     JOIN posts p ON p.author_id = s.user_id
     WHERE p.id = $1::bigint AND p.author_id <> $2::text`,
    [postId, commenterId],
  );
  return rows;
}

async function deliver(subscriptions: StoredPushSubscription[], payload: PushPayload) {
  const config = vapidConfig();
  if (!config || subscriptions.length === 0) return;

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const message = JSON.stringify({ ...payload, icon: "/icons/knit.svg" });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          message,
          { TTL: 60 * 60 * 24, urgency: "normal" },
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1::text", [subscription.endpoint]);
          return;
        }
        console.warn(`[push] delivery failed${statusCode ? ` (${statusCode})` : ""}`);
      }
    }),
  );
}

export async function notifyNewPost(input: { authorId: string; authorName: string; postId: string }) {
  await deliver(await subscriptionsForNewPost(input.authorId), {
    title: "New family post",
    body: `${input.authorName} shared a post.`,
    url: `/posts/${input.postId}`,
    tag: `post-${input.postId}`,
  });
}

export async function notifyPostComment(input: { commenterId: string; commenterName: string; postId: string }) {
  await deliver(await subscriptionsForPostAuthor(input.postId, input.commenterId), {
    title: "New comment",
    body: `${input.commenterName} commented on your post.`,
    url: `/posts/${input.postId}`,
    tag: `post-${input.postId}-comment`,
  });
}
