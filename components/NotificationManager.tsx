"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/app/notifications/actions";

type State = "loading" | "unsupported" | "ios-install" | "off" | "on";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

function sameApplicationKey(subscription: PushSubscription, publicKey: Uint8Array<ArrayBuffer>) {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === publicKey.length && bytes.every((value, index) => value === publicKey[index]);
}

function serialized(subscription: PushSubscription) {
  const value = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: value.keys?.p256dh ?? "", auth: value.keys?.auth ?? "" },
  };
}

export function NotificationManager({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (isIOS() && !isStandalone()) {
        if (!cancelled) setState("ios-install");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setState("unsupported");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        let existing = await registration.pushManager.getSubscription();
        const applicationKey = decodeVapidKey(publicKey);
        if (existing && !sameApplicationKey(existing, applicationKey)) {
          await existing.unsubscribe();
          existing = null;
        }
        if (cancelled) return;
        setSubscription(existing);
        setState(existing ? "on" : "off");
        if (existing) {
          const result = await subscribeToPush(serialized(existing));
          if (!result.success && !cancelled) setMessage(result.error);
        }
      } catch {
        if (!cancelled) {
          setState("unsupported");
          setMessage("This browser could not set up notifications.");
        }
      }
    }

    void prepare();
    return () => { cancelled = true; };
  }, [publicKey]);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(permission === "denied"
          ? "Notifications are blocked in this browser's settings."
          : "Notification permission was not granted.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const nextSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey),
      });
      const result = await subscribeToPush(serialized(nextSubscription));
      if (!result.success) {
        await nextSubscription.unsubscribe();
        setMessage(result.error);
        return;
      }
      setSubscription(nextSubscription);
      setState("on");
      setMessage("Notifications are enabled on this device.");
    } catch {
      setMessage("Notifications could not be enabled. Check this browser's notification settings and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!subscription) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await unsubscribeFromPush(subscription.endpoint);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      await subscription.unsubscribe();
      setSubscription(null);
      setState("off");
      setMessage("Notifications are disabled on this device.");
    } catch {
      setMessage("Notifications could not be disabled. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <p className="text-sm text-muted">Checking this device…</p>;
  if (state === "ios-install") {
    return (
      <div className="space-y-2">
        <h2 className="font-serif text-xl font-semibold">Add Knit to your Home Screen</h2>
        <p className="text-sm leading-relaxed text-muted">
          On iPhone or iPad, tap the Share button, choose <strong className="text-fg">Add to Home Screen</strong>,
          then open Knit from its new icon and return to this page.
        </p>
      </div>
    );
  }
  if (state === "unsupported") {
    return (
      <div className="space-y-2">
        <h2 className="font-serif text-xl font-semibold">Not available in this browser</h2>
        <p className="text-sm leading-relaxed text-muted">
          Try a current version of Chrome, Edge, Firefox, or Safari. On iPhone and iPad, Knit must be opened from the Home Screen.
        </p>
        {message && <p role="status" className="text-sm text-error">{message}</p>}
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold">
        {state === "on" ? "Notifications are on" : "Get notifications on this device"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {state === "on"
          ? "You will hear about new family posts and comments on your posts."
          : "Your browser will ask for permission after you tap Enable."}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={state === "on" ? disable : enable}
        className="mt-4 min-h-11 rounded-lg border border-control px-4 py-2 font-medium hover:border-accent disabled:opacity-60"
      >
        {busy ? "Working…" : state === "on" ? "Disable notifications" : "Enable notifications"}
      </button>
      {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
    </div>
  );
}
