# Maintenance mode & going live

**You never need a laptop or any commands for this.** Maintenance mode is
now a switch inside the admin panel.

| File | What it is |
|---|---|
| `index.html` | The real Tasklily app, with the maintenance screen built in |
| `admin.html` | Admin panel — has the maintenance switch |
| `maintenance.html` | Spare standalone maintenance page (emergency only) |

## Right now

The site is **closed** and shows the maintenance screen. It opens by
itself at **8:00 AM Wednesday 20 August (Nigeria time)** even if you do
nothing.

## To open or close the site from your phone

1. Open the admin panel and sign in.
2. Go to **Settings**.
3. Top switch: **🔧 Maintenance mode**
   - **ON** → everyone sees the maintenance screen
   - **OFF** → the site is live

It saves the moment you flip it — there is no Save button to press for
this one. Users see the change **within 10 minutes**.

Flipping it manually also cancels the automatic 8:00 AM opening, so
whichever position you leave it in is the one that sticks.

## One thing to check after the site opens

Open the admin panel once and confirm Firestore has a **`config`**
collection containing an **`app`** document with your tasks in it. The
admin panel writes this automatically every time it loads.

It matters because the app reads that one document instead of reading
every task separately. If it is missing, the app still works — it just
falls back to the expensive path that caused the original quota crash.

## Firestore rules

Paste `FIRESTORE-RULES.txt` into Firebase Console → Firestore → Rules →
Publish. The `config` rule covers both `config/app` and `config/status`,
so the maintenance switch needs no extra rule.

## Budget this is built to

At 20,000 users each completing 20 tasks a day:

- **Reads ~25k/day** — one user document per device per 12 hours, one
  shared config document per user per week, one referral query per user
  per 3 days, plus the cached maintenance check.
- **Writes ~14k/day** — each user's document is written at most once
  every 36 hours, plus withdrawals.

Completing a task costs nothing at all. It is credited in memory and
saved in the browser, and reaches Firestore folded into that user's next
periodic sync.

### Knobs (all near the top of `index.html`)

| Setting | Default | What it does |
|---|---|---|
| `SYNC_MIN_HOURS` | 36 | How often one user costs a write. Lower = safer backups, more writes (about `20000 x 24 / value` per day). |
| `USER_DOC_TTL_MS` | 12h | How long a cached profile is trusted before re-reading the server. |
| `REFERRALS_TTL_MS` | 72h | How stale the referral list may get. |
| `CONFIG_TTL_MS` | 7 days | How long until task edits reach users. |
| `STATUS_TTL_MS` | 10 min | How fast the maintenance switch reaches users. |

### Known trade-offs

- Task proofs are auto-approved; the admin panel no longer reviews them.
  The screenshot is never uploaded or stored — it is discarded on the spot.
- `taskSubmissions` and `transactions` are no longer written. Per-user
  history lives in each user document (last 60 entries).
- A balance can take up to 36 hours to appear on a **different** device.
  A withdrawal forces an immediate sync, so money is always correct at
  the point it matters. If a user clears their browser data before a
  sync, unsynced earnings are lost.
