# Next

**Action:** Verify the new live push notifications end to end on a real phone with two member accounts.
**Why now:** The implementation, database targeting, production build, and live endpoints are verified, but no browser has opted in yet, so actual delivery is the one remaining proof.
**Start here:** On the receiving phone, sign in at `https://knit.marzipan-solutions.com/notifications`. On iPhone/iPad, first use Share → Add to Home Screen and reopen Knit from its icon; then tap Enable notifications. Use another member account to create a family post and then comment on a post owned by the receiving account.
**Verify with:** With Knit closed, the phone receives “New family post” and “New comment”; each tap opens the exact post. Confirm the notification names the actor without showing post/comment text, and that your own post or self-comment does not notify you. Record the device/browser version in `VERIFICATION.md` row 28.
**Watch out for:** Notification permission must be granted at the operating-system level. iOS/iPadOS push works only from the Home Screen web app; enabling notifications in a normal Safari tab is intentionally replaced with install instructions.
