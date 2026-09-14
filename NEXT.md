# Next

**Decision first (Kit):** fix the top findings from the Codex layout/color audit before launch, or launch now and fix after? Recommendation: fix first. The family is on phones, and form fields are nearly invisible (borders 1.25:1) with tap targets under 44px.

**Action (if fixing first):** one UI slice covering the audit's top five:
1. A `--control-line` token (light `#978c80`, dark `#766c5f`, both ≥3.1:1) on fields, buttons, and clickable cards; `--line` stays for dividers.
2. `placeholder:text-muted` on inputs, plus visible labels on the search and reference fields.
3. 44px minimum targets (`min-h-11`) on buttons, fields, reactions, reader chips, and header links; and a phone nav that doesn't hide links offscreen.
4. A print block forcing a white background and dark text, with page margins.
5. Error color tokens; `dark:text-red-400` on the failed tool chip (`components/assistant/AssistantChat.tsx:143`).

**Then launch:** push (11+ commits, public repo: check for secrets first), then follow `deploy/BOOTSTRAP.md` on the VPS with Kit's OK for each outward step.

**Start here:** `app/globals.css:3-34` (tokens), `app/layout.tsx:46-66` (header and nav), `components/SignInForm.tsx:57` (`Field`). The full Codex report isn't in the repo. The SPEC 2026-09-14 "Deploy prep" entry summarizes it, and the file:line findings are re-derivable by grepping `border-line`, `outline-none`, `placeholder=`, `text-red-700`.

**Verify with:** `npm run typecheck && npm test && npm run build`. A contrast script (WCAG luminance, like the one run 2026-09-14) shows every new token pair ≥3:1 for borders and ≥4.5:1 for text. Then curl a page to confirm the classes render. Kit's phone check happens at launch.

**Waiting on Kit:**
- The decision above.
- The family's time zone for the Come, Follow Me week (currently `America/New_York`).

**Watch out for:**
- **At deploy, Kit tests the talk builder on his phone** at `knit.marzipan-solutions.com` (touch dragging; he chose this over LAN dev testing, 2026-09-14).
- **At deploy, re-check the rate limit through the real Caddy:** 6 wrong passwords from one phone → 429, while another device still signs in. The app must bind to localhost only, because `trustedProxies` in `lib/auth.ts` relies on it (`deploy/knit.service` does).
- **Production `BETTER_AUTH_URL` must be `https://knit.marzipan-solutions.com`.** Invite and reset links are built from it.
- **The VPS Node must support `--env-file-if-exists`** (BOOTSTRAP §0 checks); the npm scripts depend on it.
- **Throwaway member recipe:** an `.mts` script under `node_modules/.cache/` (gitignored, and bare imports like `better-auth` resolve there), run with `node --env-file-if-exists=.env.local --import tsx`; sign in with `curl -c jar -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"email":…,"password":…}' /api/auth/sign-in/email`. React puts `<!-- -->` between static text and `{values}`, so grep the pieces separately. Delete the users and the script afterward.
- **Don't overlap `npm run build` with tests.** Its prebuild step rewrites `data/scriptures`. Stop the dev server before building.
- **Browser checks run in Kit's session only with his OK.** No typing passwords into the browser.
