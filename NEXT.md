# Next

**Action:** Talk builder T3: rebuild `/talks/[id]/print` from the talk's capsules (headings, thoughts, links, and scriptures with full verse text, in the arranged order) and put the "Print view" link back on the builder page.

**Why now:** It's the last slice of the builder Kit asked for. The current print page still renders the retired markdown `talks.body`, so it shows nothing for talks built with capsules. (Kit put Come, Follow Me and the Knit rename ahead of it on 2026-09-13; both are done.)

**Start here:** `app/talks/[id]/print/page.tsx:25` (still reads `talk.body` through Markdown); use `listItems(user.id, id)` from `lib/talk-items.ts:70`; re-add the link in `app/talks/[id]/page.tsx`. `components/PrintButton.tsx` and the layout's `print:hidden` header/footer already exist.

**Verify with:** `npm run typecheck && npm test` (109 today). Then, as a throwaway member, `curl /talks/<id>/print` shows each capsule in order with the scripture text, and another member's talk returns 404. Finally, the browser print preview has no site header or footer.

**Watch out for:**
- **Throwaway member recipe:** an `.mts` script under `node_modules/.cache/` (gitignored, and bare imports like `better-auth` resolve there), run with `node --env-file-if-exists=.env.local --import tsx`; sign in with `curl -c jar -H "Origin: http://localhost:3000" -d '{"email":…,"password":…}' /api/auth/sign-in/email`. Delete the user and the script afterward.
- **Don't overlap `npm run build` with tests.** Its prebuild step rewrites `data/scriptures`.
- **Browser checks run in Kit's session only with his OK.** No typing passwords into the browser.
