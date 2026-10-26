# Rerun

Life repeats. Your checklists should too. 🔁<br>
Create it once. Check it off. Reset. Rerun.

<img src="docs/screenshot.png" alt="Rerun: running a kayaking checklist" width="800">


[![CI](https://img.shields.io/github/actions/workflow/status/nwish/rerun/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/nwish/rerun/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/nwish/rerun?style=flat-square&label=Release)](https://github.com/nwish/rerun/releases)
[![Docker Publish](https://img.shields.io/github/actions/workflow/status/nwish/rerun/publish.yml?style=flat-square&label=Docker%20Publish)](https://github.com/nwish/rerun/actions/workflows/publish.yml)
[![License](https://img.shields.io/github/license/nwish/rerun?style=flat-square)](https://github.com/nwish/rerun/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/nwish/rerun?style=flat-square)](https://github.com/nwish/rerun/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/nwish/rerun?style=flat-square)](https://github.com/nwish/rerun/commits/main)

Rerun turns repeatable activities into checklists. Build a list for each thing you do more than once — kayaking, road trips, campouts, yard work — then keep it exactly the way you want it.

Going kayaking? Open the kayaking list, run through it top to bottom, and go kayaking. Reset the list and it's ready for next time.

Local and self-hosted: everything lives on your machine in a SQLite file. No cloud account, no sync, no subscription.

## 🔁 Things You Can Rerun

A few things worth checking twice (or a hundred times).

| | Checklist | Why? |
|:---:|---|---|
| 🚣 | **Kayaking** | Paddle? Check. Kayak? Hopefully. |
| 🏕️ | **Camping** | Because forgetting tent stakes once is enough. |
| 🚙 | **Road Trips** | One checklist, a hundred adventures. |
| 🏠 | **Home Projects** | For those jobs you'll definitely do again. |
| 🧳 | **Travel Packing** | Your passport would appreciate being remembered. |
| 🔧 | **Maintenance** | Oil changes, seasonal chores, and everything in between. |

## Stack

| Layer     | Tech                                                        |
| --------- | ----------------------------------------------------------- |
| Backend   | Node.js, Express 4, TypeScript (ESM)                         |
| Frontend  | React 18, Vite, TypeScript                                   |
| Database  | SQLite via `better-sqlite3` (WAL mode)                       |
| Auth      | PBKDF2 password hashing, server-side sessions in SQLite      |

![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Self Hosted](https://img.shields.io/badge/Self--Hosted-Ready-2ea44f?style=flat-square&logo=serverfault&logoColor=white)

## Docker Compose

```bash
services:
  rerun:
    image: ghcr.io/nwish/rerun:latest
    ports:
      - "3001:3001"
    volumes:
      - rerun-data:/app/data
    restart: unless-stopped
    # environment:
    #   # Behind TLS (reverse proxy): session cookies get the Secure flag
    #   - HTTPS=1
    #   # Behind a reverse proxy: rate limits use the real client address, not the proxy's
    #   - TRUST_PROXY=1
    #   # Public origin used in invitation links
    #   - APP_URL=https://rerun.example.com
    #   # Invitation email (without SMTP_HOST, invite links are logged instead)
    #   - SMTP_HOST=smtp.example.com
    #   - SMTP_PORT=587
    #   - SMTP_USER=you@example.com
    #   - SMTP_PASS=your-smtp-password
    #   - SMTP_FROM=Rerun <rerun@example.com>

volumes:
  rerun-data:
```

## Development

Need Node.js **≥ 22.12** (24 recommended) and npm

```bash
npm install
npm run dev
```

- App: http://127.0.0.1:5173
- API:  http://127.0.0.1:3001 (the Vite dev server proxies `/api/*` here)

Both servers run under one command (`concurrently`); `api` runs in watch mode.

**First account:** none is seeded. Open the app → "No account? Create one" → register. That account is yours and admin.

| Script                | What it does                                        |
| --------------------- | --------------------------------------------------- |
| `npm run dev`         | API (watch mode) + Vite dev server together         |
| `npm run dev:api`     | API only (http://127.0.0.1:3001)                    |
| `npm run dev:web`     | Vite dev server only (http://127.0.0.1:5173)        |
| `npm run build`       | Build the frontend to `dist/` (API runs TS directly) |
| `npm start`           | Production: Express serves the built UI + API       |
| `npm run typecheck`   | Type-check the frontend without emitting            |

## Production

```bash
npm run build
npm start        # serves UI and API on http://127.0.0.1:3001
```

## Configuration (env vars)

| Var        | Default     | Notes                                  |
| ---------- | ----------- | -------------------------------------- |
| `PORT`     | `3001`      | API port                               |
| `HOST`     | `127.0.0.1` | Bind address; set `0.0.0.0` to expose  |
| `NODE_ENV` | —         | `production` serves the built UI      |
| `HTTPS`    | —         | `1` adds the `Secure` flag to the session cookie — set only when served over TLS (reverse proxy, etc.) |
| `SMTP_HOST` | —        | SMTP server for invitation emails (e.g. `smtp.fastmail.com`). Unset: emails are logged to the server console instead of sent |
| `SMTP_PORT` | `587`    | SMTP port |
| `SMTP_SECURE` | —      | `1` for implicit TLS (port 465); default uses STARTTLS |
| `SMTP_USER` | —        | SMTP auth user (optional; some relays need no auth) |
| `SMTP_PASS` | —        | SMTP auth password |
| `SMTP_FROM` | `Rerun <rerun@localhost>` | From address for emails |
| `APP_URL`   | request origin | Base URL used in invitation links when the email is sent |
| `TRUST_PROXY` | — | Set when running behind a reverse proxy so rate limits see real client addresses: a hop count (`1` for one proxy) or a name/CIDR list (`loopback,172.16.0.0/12`). Leave unset when clients connect directly — trusting the header with no proxy in front lets anyone forge their address |

The server reads a `.env` file from the repo root when present — create it from `.env.example`. Values in a real environment always take precedence over the file.
