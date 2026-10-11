## Accounts & invitations

- The **first** account registered becomes the **admin**. After that, registration is **closed** by default (`403`) — new users are added by invitation.
- An admin invites by email; the invitee gets a single-use link to set their password. Inviting an email that was already sent (but not yet activated) rotates the link and resends.
- Invited users can sign in only after activating via the link.
- The admin panel (visible to `role: admin` only) shows members, pending invites, the invite form, and a **Registration** switch.
- **Deleting an account** (admin panel): every row except your own has **Delete**. The confirm modal first fetches what belongs to that account and lists it — their checklists and items, their finished run records, runs they finished on someone else's list (those stay, without an author), their sharing, their access to lists others shared with them, their place in live runs, their checks on other people's lists, and the devices they'll be signed out of. A pending invite says so instead. Deleting is permanent and can't be undone; you can't delete your own account (`409`). Their open live-run sockets close immediately, and everyone else in those runs is told the roster changed. API: `GET /api/admin/users/:id/blast` (preview), `DELETE /api/admin/users/:id`.
- **Open registration** (admin panel, off by default): when an admin opens it, the sign-in page offers "Create one" and anyone who can reach the instance can register with an email and password — no invitation and no email verification. They get the `user` role and are signed in immediately. Closing it again doesn't affect existing accounts. An email that already has an account, or a pending invitation, can't be registered this way (`409`). Only open it on a private network, or while you're onboarding people. API: `GET /api/auth/config` (public: whether to offer sign-up), `GET`/`PUT /api/admin/settings` (`{ registrationOpen }`, admin only).
- **Profile** (Settings page): each person can set a display name (up to 60 characters) and pick an avatar from the same icon pack used for checklists; until then they show as their email with their initials. Other people see these on shared lists, in the live run's "In this run now", in your sharing list, in History and in the admin panel. Names aren't unique or verified, so places where it matters (the sharing list, admin panel) also show the email. API: `PATCH /api/auth/me` (`{ name?, avatar? }`, `null` clears).

## Sharing

- Owners share with existing, activated users by email, from the Checklists page: either **Share all lists** (live — includes lists created later) or **Share this list** on a single list.
- Each share has two independent settings:
  - **Item access** — *View items* (can run the list: check items and reset it, but not change it) or *Edit items* (can also add, edit, reorder and delete items). Renaming, changing the icon, deleting a list, and managing shares stay owner-only.
  - **Mode** — *Shared*: the person runs the list on their own, with their own checks and their own history; nothing they check affects you. *Collaborative*: they join your one live run — checks are common, and everyone in the run sees changes instantly.
- A list-specific share overrides the owner's share-all for that person (both settings), so you can share everything as collaborative but one list as shared.
- **Live runs** use a websocket (`/api/live`, same origin, authenticated by the session cookie; cross-origin upgrades are refused). The dashboard shows who else is in the run and updates as they check items; it reconnects automatically. The socket only carries "something changed" and presence notices — data and permissions stay on the HTTP API. If you serve the app behind a reverse proxy, it must pass WebSocket upgrades for `/api/*` (e.g. nginx `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`).
- Switching a share's mode takes effect immediately: a collaborator switched to shared leaves the live run and sees their own (initially empty) checks; switching back returns them to the common run, and their earlier personal checks reappear.
- Existing shares from before modes were added keep their old behavior and became **collaborative**.
- **Run together**: people shared in *Shared* mode can still join specific runs. On the Dashboard the owner opens **Run together** and ticks the people to invite (collaborative people are always in the run). An invitee sees a banner and chooses **Join live run**; while joined they work the common run with everyone else, and **Leave live run** returns them to their own checks, which are never touched. The run ends — and everyone goes back to their own run — when the list is reset (by anyone in the run) or the owner chooses **End live run**; the next run needs fresh invitations. Removing a share or switching it to collaborative clears the person's invitation. The run header shows **Live · N people** and Reset's tooltip warns it clears the checks for everyone in the run. API (owner): `GET`/`PUT` (`{ emails }`)/`DELETE /api/checklists/:id/live`; invitee: `POST /api/checklists/:id/live/join` and `/live/leave`. Lists and list detail also include `liveInvite`, `liveJoined` and `liveWith` (how many others are in the run you're in).
  - A *Shared*-mode person can also **start** one: **Run together** on the run view asks the owner. The owner sees a banner (and a "wants to run together" tag in the list picker) and answers with **Accept** or **Decline** in their Run together panel — a request never lets someone join on their own, because the common run is the owner's checks. The requester sees "Waiting for … to accept" with **Cancel request**; after an accepted run ends they ask again. API: `POST /api/checklists/:id/live/request` (shared-mode person), `POST /api/checklists/:id/live/respond` (owner, `{ email, accept }`). Lists also include `liveRequested` (you asked) and `liveRequests` (owner: how many are waiting).
- Shared lists appear on the Dashboard and Checklists page labelled with the owner. Revoking a share removes access immediately; deleting a list or account removes its shares.
- API: `GET /api/shares`, `PUT /api/shares` (`{ email, permission, mode, checklistId? }`; omit `checklistId` for all lists), `DELETE /api/shares/:id`. Lists and list detail include `access` (`owner` | `edit` | `view`), `scope` (`common` | `personal` — whose checks you see) and `ownerEmail`. Unshared lists return `404`; insufficient access returns `403`.
- The share endpoint reveals whether an email belongs to an active account (needed for a usable UI), so it is limited to 60 requests / 15 min per IP.

## Duplicating lists

- **Duplicate** (on each list's card, Checklists page) copies a list into a new list you own, titled "<title> (copy)", with the same icon and items, all unchecked. Shares are not copied.
- You can duplicate any list you can see, including view-only lists shared with you — the copy is yours to edit. API: `POST /api/checklists/:id/duplicate` (`404` if the list isn't visible to you).

## Run history & analytics

- **Reset records a run.** Resetting a list that has at least one checked item saves a run first: which items were checked or missed, who reset it, when, and how long it took (from the first check after the previous reset). Resetting with nothing checked records nothing.
- The **History** page shows runs per week (last 12 weeks), runs in the last 30 days, average share of items checked, average time, the items you miss most often, a per-list breakdown (click a list to filter), and the latest 50 runs with the items that weren't checked.
- History covers the runs you take part in: lists you own or collaborate on (common runs, with who did them) plus your own runs on lists shared with you in shared mode. A shared-mode person's runs are private to them; the owner doesn't see them. Runs keep the list title and item text as they were at reset, so later edits don't rewrite history. Deleting a list deletes its runs.
- Runs are only recorded from now on; earlier resets can't be reconstructed. API: `GET /api/history[?checklistId=]`.

## Auth & security notes

- Passwords: PBKDF2-HMAC-SHA256, 600,000 iterations, per-user 16-byte random salt, stored as `pbkdf2-sha256$<iter>$<salt>$<hash>`.
- Sessions: 256-bit random token; only its SHA-256 hash is stored (with 30-day expiry); token delivered in an `HttpOnly`, `SameSite=Lax` cookie (`rerun_session`).
- Login never reveals whether an email exists, and unknown-email logins burn a dummy hash so timing stays uniform. (While registration is open, the sign-up form necessarily reveals whether an email already has an account.)
- Invite links: 256-bit single-use token; only its SHA-256 hash is stored; consumed on activation or rotated on resend.
- Rate limiting (in-memory, per IP+email): 5 logins / 5 min, 10 registrations / 15 min, 10 invites / 15 min, 5 activations per link / 5 min. Behind a reverse proxy, set `TRUST_PROXY` (see Configuration); without it every client appears to have the proxy's address and these limits apply to all users together.
- Signed-in API traffic (checklists, shares, history, `/api/auth/me`) is limited to 300 requests per minute **per session** (not per IP, so it works the same with or without `TRUST_PROXY`); normal use stays far below this.
- JSON body limit 16 KB; malformed bodies get a generic 400.

## Data & reset

- Database: `data/rerun.db` (gitignored).
- **Upgrades are automatic.** On startup the app applies any pending schema migrations before it serves anything — nothing to run by hand when you update. Before upgrading an existing database it saves a copy to `data/backups/` (the five newest are kept). If a migration fails it is rolled back and the app refuses to start rather than run on a half-upgraded database; restore from the backup if you need to. A database from a *newer* version than the app is refused too, so rolling back to an older image needs the matching older backup.
- Reset everything: stop the app, delete the `data/` directory, restart.