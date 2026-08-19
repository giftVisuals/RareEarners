# Going live after maintenance

`main` currently serves the maintenance page. All the real code is here too:

| File | What it is |
|---|---|
| `index.html` | What visitors see right now — the maintenance page |
| `app.html` | The real Tasklily app (optimised for the Firestore free tier) |
| `admin.html` | Admin panel |
| `maintenance.html` | Spare copy of the maintenance page |

## Before flipping the switch

1. **Paste the Firestore rules** from `FIRESTORE-RULES.txt` into
   Firebase Console → Firestore → Rules → Publish.
   Without the `config/app` rule the app falls back to reading every
   task document on every login, which is what blew the quota.

2. **Open the admin panel once.** It publishes `config/app`
   automatically on load. Check Firestore shows a `config` collection
   with an `app` document containing your tasks.

## Flip live

```
cp app.html index.html
git add -A && git commit -m "Go live" && git push origin main
```

## Go back to maintenance

```
cp maintenance.html index.html
git add -A && git commit -m "Maintenance mode" && git push origin main
```

## Budget this is built to

At 20,000 users each completing 20 tasks a day:

- **Reads ~30k/day** — one user document per login, plus one shared
  config document per user per week, plus one referral query per user
  per 3 days.
- **Writes ~14k/day** — each user's document is written at most once
  every 36 hours (`SYNC_MIN_HOURS` in `app.html`), plus withdrawals.

Completing a task costs nothing at all: it is credited in memory and
saved to the browser, and reaches Firestore folded into that user's
next periodic sync.

### Knobs

- `SYNC_MIN_HOURS` (default 36) — lower it to back users up more often,
  at roughly `20000 * 24 / SYNC_MIN_HOURS` writes per day.
- `REFERRALS_TTL_MS` (default 72h) — how stale the referral list may get.
- `CONFIG_TTL_MS` (default 7 days) — how long until task edits reach
  users who never clear their cache.

### Known trade-offs

- Task proofs are auto-approved; the admin panel no longer reviews them.
- `taskSubmissions` and `transactions` are no longer written. Per-user
  history lives in each user document (last 60 entries).
- A user's balance can take up to `SYNC_MIN_HOURS` to appear on another
  device. A withdrawal forces an immediate sync, so money is always
  correct at the point it matters. If a user clears their browser data
  before a sync, unsynced earnings are lost.
