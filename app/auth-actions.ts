"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// A server action rather than a client call, so Sign out works even before the page's
// JavaScript has loaded (slow phones).
export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
