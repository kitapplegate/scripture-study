import type { Metadata } from "next";
import { NotificationManager } from "@/components/NotificationManager";
import { publicVapidKey } from "@/lib/push";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireUser();
  const vapidKey = publicVapidKey();

  return (
    <>
      <h1 className="font-serif text-3xl font-semibold">Notifications</h1>
      <p className="mt-2 leading-relaxed text-muted">
        Knit can notify this device when a family member shares a new post and when someone comments on your post.
      </p>
      <div className="mt-6 rounded-xl border border-line bg-card p-5">
        {vapidKey ? (
          <NotificationManager publicKey={vapidKey} />
        ) : (
          <p className="text-sm text-muted">Push notifications are not configured on the server yet.</p>
        )}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        This setting applies only to this browser or device. Repeat it on another device if you want notifications there too.
      </p>
    </>
  );
}
