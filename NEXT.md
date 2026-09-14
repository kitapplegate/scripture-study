# Next

**Action:** Talk builder T3: rebuild `/talks/[id]/print` from the talk's capsules (headings, thoughts, links, and scriptures with full verse text, in the arranged order) and put the "Print view" link back on the builder page.

**Why now:** It's the last slice of the builder Kit asked for. The current print page still renders the retired markdown `talks.body`, so it shows nothing for talks built with capsules.

**Start here:** `app/talks/[id]/print/page.tsx` (still reads `talk.body`); use `listItems(user.id, id)` from `lib/talk-items.ts`; re-add the link in `app/talks/[id]/page.tsx`. `components/PrintButton.tsx` and the layout's `print:hidden` header/footer already exist.

**Verify with:** `npm run typecheck && npm test`. Then, as a throwaway member (seed with an `.mts` script in a project temp dir, sign in with curl), `curl /talks/<id>/print` shows each capsule in order with the scripture text, and another member's talk returns 404. Finally, the browser print preview has no site header or footer.

**Watch out for:**
- **Restart the dev server first.** At session end, chapter pages returned 500 there under low memory (1.3 GB free).
- **Don't overlap `npm run build` with tests.** Its prebuild step rewrites `data/scriptures`.
- **tsx scripts with top-level `await` must be `.mts`.**
- **Browser checks run in Kit's session only with his OK.** No typing passwords into the browser.
