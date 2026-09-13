// Per-user daily cap on study assistant requests (one request = one message sent,
// however many searches the model runs for it). Days are UTC.
import { pool } from "./db";

export const assistantDailyLimit = (role?: string | null) => (role === "admin" ? 150 : 30);

// Atomically counts the request if the user is under the limit.
export async function consumeAssistantRequest(userId: string, limit: number) {
  const { rows } = await pool.query<{ requests: number }>(
    `INSERT INTO assistant_usage (user_id, day, requests)
     VALUES ($1, (now() AT TIME ZONE 'UTC')::date, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET requests = assistant_usage.requests + 1
       WHERE assistant_usage.requests < $2
     RETURNING requests`,
    [userId, limit],
  );
  return rows[0] ? { allowed: true, used: rows[0].requests, limit } : { allowed: false, used: limit, limit };
}

export async function assistantRequestsToday(userId: string) {
  const { rows } = await pool.query<{ requests: number }>(
    `SELECT requests FROM assistant_usage WHERE user_id = $1 AND day = (now() AT TIME ZONE 'UTC')::date`,
    [userId],
  );
  return rows[0]?.requests ?? 0;
}
