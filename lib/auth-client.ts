import { createAuthClient } from "better-auth/react";

// Sign-in and sign-out go through HTTP (this client) on purpose: better-auth's rate
// limiter only sees HTTP requests, not server-side auth.api calls.
export const authClient = createAuthClient();
