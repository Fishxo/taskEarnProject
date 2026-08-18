# Get Rewards — Technical Project Reference

**Document type:** Static code audit and architecture reference  
**Scope:** Entire git repository `taskEarnProject` (GitHub: `https://github.com/Fishxo/taskEarnProject.git`, branch `main`)  
**Audit date:** 2026-08-17  
**Method:** Source inspection only. No application processes were started, no packages were installed, no database was queried, and no existing project files were modified except this document.

**Status legend used throughout this document**

| Label | Meaning |
|-------|---------|
| Implemented and verified | Code exists **and** there is independent runtime evidence it works |
| Implemented but not verified | Code exists; no runtime proof in this audit |
| Partially implemented | UI and/or API exist, but persistence, business logic, or integration is incomplete |
| Missing | Required for the intended product; not present |
| Potentially broken | Code exists but is likely wrong, unsafe, or will fail in production |
| Production-ready | Suitable to run on AWS EC2 with real users and money |
| Development/demo-only | Intentionally fake, in-memory, hardcoded, or local-dev |

If something cannot be determined from the repository, this document says **UNKNOWN — requires runtime verification**.

---

## 1. Project Overview

### Project name

**Get Rewards** (npm names: `get-rewards-backend`, `get-rewards-frontend`; systemd/nginx names: `get-rewards-*`; intended server path: `/home/ubuntu/get_rewards`).

The git repository folder is `taskEarnProject`. The workspace that contains the clone is `taskEarningProject`.

### Main purpose

A **Telegram Mini App** for Ethiopian users to earn **ETB (Ethiopian Birr)** by:

1. Completing a social task (join a Telegram channel)
2. Completing a numbered “watch ad” task grid
3. Inviting friends (referral bonus)

Users then request a **withdrawal** to Ethiopian payment methods (Telebirr, CBE Birr, banks, etc.).

This is **not** a bingo game. README and PROJECT_GUIDE state it should use the **same deploy style** as a separate Bingo project: AWS EC2 + Nginx + systemd.

### What problem it solves

Intended product: a SkillEarn-style rewards Mini App where users convert simple in-app tasks and referrals into withdrawable ETB.

Current repository reality: a **UI-complete prototype** with a **working Express + Vue shell**, a **Telegraf long-polling bot**, and **two API implementations**:

- `DEMO_MODE=true` — in-memory fake API (no PostgreSQL)
- `DEMO_MODE=false` — PostgreSQL-backed API (schema exists; not proven to run)

### Main users

| Actor | How they enter | What they do |
|-------|----------------|--------------|
| End user | Telegram bot `/start` → Mini App, or browser at the Vue URL | Earn, invite, withdraw |
| Admin | Same Mini App; `users.is_admin` or `ADMIN_TELEGRAM_IDS`; Admin link in AppShell | Review withdrawals, search users, edit balances, (intended) deposits/broadcasts |
| Second admin | UI claims login at `/secondadmin` | **Missing** — route and auth do not exist |
| Developer | Vite on `:5173` + Express on `:8000` | Local demo |

### Main user flows

1. **Open app** — `frontend/src/main.js` always calls `POST /api/auth/telegram`, stores JWT in `localStorage` key `gr_token`.
2. **Home** — see MAIN+BONUS balance, claim social task, watch a “live withdrawals” feed (Socket.IO `live_withdrawal` plus REST).
3. **Earn** — tap numbered ad tasks in order; each complete credits bonus balance. **No ad network is integrated.**
4. **Top** — leaderboard of `users.total_earned` (or hardcoded SYSTEM_ACCOUNTS fallback).
5. **Invite** — copy/share `https://t.me/{BOT_USERNAME}/app?startapp=ref_{code}`; referrer should receive 100 ETB once.
6. **Withdraw** — request ≥ 2000 ETB to a method + account number; backend inserts `withdrawals` with status `pending`. **No payout provider is integrated.**

### Main admin flows

Admin dashboard at `/admin-dashboard` (Vue). Intended Bingo-style control panel:

- Statistics, earn-mode counts, financial totals
- User search + balance edit
- Transaction-number search (CBE/Telebirr)
- Deposit approve/reject
- Withdrawal approve/reject
- Registered users list
- Deposit account settings + Telebirr verify API key
- Broadcast (optional balance credit) and DM
- Second-admin username/password

**Real PostgreSQL API implements only a subset.** Several admin POSTs are no-ops or HTTP 501. See Section 5.

### Current development status

| Area | Status |
|------|--------|
| Product concept / tab UI | Implemented but not verified as an end-to-end product |
| Vue Mini App screens | Implemented but not verified (this clone has no `node_modules`, no `.env`, no `frontend_dist`) |
| Express API (demo memory) | Implemented but not verified in this audit |
| Express API (PostgreSQL) | Implemented but not verified; PostgreSQL auth is **reported** as failing locally |
| Telegram bot | Implemented but not verified in this audit; long polling; Mini App button needs HTTPS |
| Admin dashboard | Partially implemented (large Bingo-style UI; many backend stubs) |
| Real ads / channel-join proof / payouts / deposits | Missing |
| Production AWS config | Partially implemented (placeholder hostnames, `DEMO_MODE=true` in `.env.example`) |
| Tests | Missing |
| Overall | **Development/demo-only prototype, not production-ready** |

### Intended final product

From README, PROJECT_GUIDE, and the admin UI (which is richer than the real backend):

- Telegram Mini App on a public HTTPS host
- Real users in PostgreSQL
- Real task completions, referrals, and wallet ledger
- Admin reviews real withdrawals (and, copied from Bingo, real deposits)
- Bot opens the Mini App and can report balance
- Nginx + systemd on Ubuntu EC2, Redis present (currently unused for app logic)

---

## 2. Technology Stack

Node.js **engine is not pinned** (`package.json` has no `"engines"`). systemd units call `/usr/bin/node`. **UNKNOWN — requires runtime verification** of the Node version on any given machine.

### Frontend

| Item | Exact finding |
|------|----------------|
| Framework | Vue 3 (`vue` lockfile **3.5.41**; range `^3.3.4`) |
| Build tool | Vite **5.4.21** (`^5.0.0`) + `@vitejs/plugin-vue` **4.6.2** |
| Router | `vue-router` **4.6.4** (`^4.2.5`), `createWebHistory()` |
| State management | **None** (no Pinia/Vuex). `AppShell` `provide`s `user` and `refreshUser` |
| UI/CSS | Global `frontend/src/style.css` (CSS variables, dark theme) + scoped SFC CSS. Admin dashboard uses a separate light purple theme. No Tailwind/Vuetify |
| API communication | Axios **1.19.0** (`^1.6.2`), `baseURL: '/api'`, Bearer JWT interceptor |
| Socket.IO | `socket.io-client` **4.8.3**, path `/socket.io` |
| Telegram | Script `https://telegram.org/js/telegram-web-app.js` in `index.html`; wrapper `services/telegram.js` |

### Backend

| Item | Exact finding |
|------|----------------|
| Runtime | Node.js ESM (`"type": "module"`) |
| HTTP | Express **4.22.2** (`^4.21.0`) |
| Auth | Telegram WebApp `initData` HMAC + JWT (`jsonwebtoken` **9.0.3**) |
| JWT | `sign`/`verify`, 7-day expiry, payload `{ sub, telegram_id, is_admin }` |
| Middleware | Custom `authRequired` / `adminRequired`; demo router has its own JWT check |
| CORS | `cors` **2.8.6** — allowlist is built then **ignored** (always `cb(null, true)`) |
| Security | `helmet` **7.2.0** with **CSP disabled** and **COEP disabled** |
| Logging | `morgan` **1.11.0** (`dev` vs `combined` by `NODE_ENV`) |
| API architecture | Single router file (no controllers/services/repositories). `app.js` swaps `demoApi.js` vs `api.js` |
| Socket.IO | `socket.io` **4.8.3** attached to the same HTTP server |
| Telegram bot | Telegraf **4.16.3**, long polling (`bot.launch`), **no webhook** |

### Database

| Item | Exact finding |
|------|----------------|
| Engine | PostgreSQL via `pg` **8.23.0** (`^8.13.0`) |
| Access | One `Pool` from `DATABASE_URL`; helper `query()` / unused `withClient()` |
| Schema | Inline SQL in `backend/src/db/migrate.js` (`CREATE TABLE IF NOT EXISTS`) |
| Migrations | **Not** node-pg-migrate / Knex / Prisma. One script: `npm run migrate` |
| Seeds | Same script; insert if table counts are 0 |

### Other

| Item | Exact finding |
|------|----------------|
| Redis | `ioredis` **5.11.1**. Connected on API start **only if `DEMO_MODE` is false**. **Never read/written** after connect |
| Telegram Bot API | Telegraf over Bot API; token from `TELEGRAM_BOT_TOKEN` |
| Nginx | `nginx/get_rewards.conf` (HTTP) and `nginx/get_rewards_https.conf` (Let’s Encrypt placeholders) |
| systemd | `get-rewards-api.service`, `get-rewards-telegram-bot.service` |
| Deploy script | `scripts/deploy_update.sh` (`npm install`, migrate, frontend build, restart units) |

### Dependency summary

**Backend `package.json` dependencies (locked versions):**

| Package | Range | Locked |
|---------|-------|--------|
| cors | ^2.8.5 | 2.8.6 |
| dotenv | ^16.4.5 | 16.6.1 |
| express | ^4.21.0 | 4.22.2 |
| helmet | ^7.1.0 | 7.2.0 |
| ioredis | ^5.4.1 | 5.11.1 |
| jsonwebtoken | ^9.0.2 | 9.0.3 |
| morgan | ^1.10.0 | 1.11.0 |
| pg | ^8.13.0 | 8.23.0 |
| socket.io | ^4.7.5 | 4.8.3 |
| telegraf | ^4.16.3 | 4.16.3 |

**Backend scripts:** `start`, `dev` (`node --watch src/index.js`), `bot`, `migrate`. No `test`, no `lint`.

**Frontend `package.json`:**

| Package | Range | Locked |
|---------|-------|--------|
| axios | ^1.6.2 | 1.19.0 |
| socket.io-client | ^4.7.5 | 4.8.3 |
| vue | ^3.3.4 | 3.5.41 |
| vue-router | ^4.2.5 | 4.6.4 |
| @vitejs/plugin-vue (dev) | ^4.5.0 | 4.6.2 |
| vite (dev) | ^5.0.0 | 5.4.21 |

**Frontend scripts:** `dev`, `build` (output `../frontend_dist`), `preview`. No `test`, no `lint`.

This workspace clone has **no `node_modules/`** and **no `frontend_dist/`**.

---

## 3. Complete Project Structure

```
taskEarnProject/
├── README.md
├── PROJECT_GUIDE.md
├── PROJECT_REFERENCE.md          ← this document (added by audit)
├── .gitignore
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── scripts/                  ← codegen; overwrites source if run
│   └── src/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
├── nginx/
├── scripts/
└── systemd/
```

### Root

| Path | What it does | Required in production | Demo/dev-only |
|------|----------------|------------------------|---------------|
| `README.md` | Short product + local commands | Docs only | No |
| `PROJECT_GUIDE.md` | Local run + EC2 update notes; server path `/home/ubuntu/get_rewards` | Docs only | No |
| `.gitignore` | Ignores `.env`, `node_modules`, `frontend_dist`, logs | Yes (repo hygiene) | No |

### `backend/`

| Path | What it does | Imports / imported by | Production |
|------|----------------|----------------------|------------|
| `backend/.env.example` | Template env. **Not loaded at runtime.** Runtime file is `backend/.env` (gitignored; **not in this clone**) | Loaded by `config.js` as `../.env` | Example only; real `.env` required |
| `backend/src/config.js` | Loads dotenv, exports `config` | Imported by app, index, auth, pool, redis, bot, both routers | **Required** |
| `backend/src/index.js` | HTTP server, Socket.IO, optional Redis connect, listen | Entry: `npm start` / `npm run dev` / systemd API | **Required** |
| `backend/src/app.js` | Express app: helmet, CORS, morgan, JSON, `/api` router swap, static `frontend_dist`, error handler | `index.js` | **Required** |
| `backend/src/routes/api.js` | PostgreSQL API (all real endpoints) | `app.js` when `DEMO_MODE` is false | **Required** for real mode |
| `backend/src/routes/demoApi.js` | In-memory API mirroring the same paths | `app.js` when `DEMO_MODE` is true | **Development/demo-only** |
| `backend/src/middleware/auth.js` | Telegram initData validation, JWT, `upsertTelegramUser`, `authRequired`, `adminRequired` | `api.js`; bot `/start` upsert | **Required** for real mode |
| `backend/src/realtime.js` | Module-level `io` getter/setter | `index.js` sets; routers emit `live_withdrawal` | **Required** for live feed |
| `backend/src/db/pool.js` | `pg.Pool` from `DATABASE_URL` | `api.js`, `auth.js`, `migrate.js`; bot `/balance` dynamic import | **Required** when not demo |
| `backend/src/db/redis.js` | Lazy `ioredis` client | `index.js` only | Present but **unused for features** |
| `backend/src/db/migrate.js` | CREATE TABLE + seed; then `pool.end()` | `npm run migrate` only (not imported by the API process) | **Required** once for real DB |
| `backend/src/bot/index.js` | Telegraf bot process | `npm run bot` / systemd bot unit | **Required** for Telegram |
| `backend/src/data/systemAccounts.js` | 10 fake “system” people, earn-task defaults, feed/leaderboard/feedback builders | `demoApi.js`, `migrate.js` seed | Seed/demo data; **do not treat as real users** |

### `backend/scripts/` (codegen — dangerous if executed)

These files **write** Vue/JS source. They are **not** in `package.json` scripts. **Development/demo-only. Do not run on the server.**

| Script | Overwrites |
|--------|------------|
| `writeBingoStyleAdmin.mjs` | `frontend/src/views/AdminDashboard.vue` |
| `writeAdminDashboard.mjs` | Older/simpler `AdminDashboard.vue` |
| `writeHomeView.mjs` | `frontend/src/views/HomeView.vue` |
| `writeSystemAccounts.mjs` | system-account data files |
| `patchDemoApi.mjs` | `backend/src/routes/demoApi.js` |
| `patchMigrateSeed.mjs` | `backend/src/db/migrate.js` seed block |

### `frontend/`

| Path | What it does | Production |
|------|----------------|------------|
| `index.html` | Mount point; loads Telegram WebApp JS from telegram.org | Source for Vite build |
| `vite.config.js` | Dev server `:5173`, proxies `/api` and `/socket.io` to `127.0.0.1:8000`; build `outDir` = `taskEarnProject/frontend_dist` | Dev + build |
| `src/main.js` | Router, Telegram init, `registerTelegram`, mount | **Required** |
| `src/App.vue` | `<router-view />` only | **Required** |
| `src/style.css` | Global theme | **Required** |
| `src/components/layout/AppShell.vue` | Top bar, 5-tab nav, admin link, `getMe()` | **Required** |
| `src/views/*.vue` | Pages (Section 4) | **Required** |
| `src/services/api.js` | All REST helpers | **Required** |
| `src/services/socket.js` | Singleton Socket.IO client | **Required** for Home live feed |
| `src/services/telegram.js` | WebApp ready/expand/initData | **Required** inside Telegram |
| `src/data/systemAccounts.js` | Frontend fallbacks (same fake people) | Fallback/demo |

`App.js` static path: `config.frontendDist` = `backend/src` → `../../frontend_dist` = **repo-root `frontend_dist/`**, matching Vite `outDir`. If that folder is missing, Express serves JSON at `/` instead of the Mini App.

### `nginx/`

| File | Role | Production |
|------|------|------------|
| `get_rewards.conf` | HTTP reverse proxy to `127.0.0.1:8000`; Socket.IO upgrade | First-boot / before certbot |
| `get_rewards_https.conf` | HTTP→HTTPS redirect + TLS placeholders `YOUR-HOST.sslip.io` | Intended production; **must be edited** |

### `systemd/`

| File | ExecStart | Production |
|------|-----------|------------|
| `get-rewards-api.service` | `node .../backend/src/index.js` | **Required** |
| `get-rewards-telegram-bot.service` | `node .../backend/src/bot/index.js` | **Required** |

Both: `User=ubuntu`, `WorkingDirectory=/home/ubuntu/get_rewards/backend`, `EnvironmentFile=.../backend/.env`, `NODE_ENV=production`, `After/Wants` postgresql + redis-server.

### `scripts/deploy_update.sh`

Intended to run **on EC2 after git pull**: backend `npm install` + migrate, frontend `npm install` + build, `systemctl restart` both units. **Required** as an ops helper; not used locally.

---

## 4. Frontend

Router (`frontend/src/main.js`): `createWebHistory()`. There is **no navigation guard**. JWT is requested at boot, not per-route.

Boot always attempts auth:

- In Telegram WebApp: `POST /auth/telegram` with `initData` + start param
- In a normal browser: `POST /auth/telegram` with `initData: null` and `demo_telegram_id: 1001`

If auth throws, the app still mounts (pages then fail `getMe` / API calls).

### 4.1 AppShell — layout (not a page)

- **Route:** parent `/`
- **Sees:** “Get Rewards” header; Admin link if `user.is_admin`; five tabs (Amharic/English mix)
- **API:** `GET /me` on mount (`getMe`)
- **Auth:** expects JWT already in `localStorage`
- **Telegram / Socket:** none directly
- **Missing:** no login screen; no handling if `/me` 401

### 4.2 HomeView

| Field | Detail |
|-------|--------|
| Purpose | Balance, social task, live withdrawal feed |
| URL | `/home` (default redirect from `/`) |
| User sees | Title “Skill Money”; total balance; “ጠቅላላ ገቢ”; social card; LIVE list |
| API | `GET /tasks/social`, `POST /tasks/social/:id/claim`, `GET /feed/withdrawals`; `refreshUser` → `GET /me` |
| Data | `balance_main + balance_bonus`, `total_earned`, tasks, feed |
| Actions | Open channel URL (new tab); Claim; no other |
| Auth | Indirect (JWT). Hardcoded fallback task if API empty |
| Telegram | Channel URL hardcoded fallback `https://t.me/GetRewardsChannel` — **UNKNOWN** if that channel exists |
| Socket | Subscribes to `live_withdrawal` |
| Missing / suspicious | Claim **does not verify** Telegram membership. On **API error**, UI still sets `task.claimed = true` (see Section 18). Fallback live feed is fake SYSTEM_ACCOUNTS. No proof feed items are real paid withdrawals |

### 4.3 EarnView

| Field | Detail |
|-------|--------|
| Purpose | Sequential “watch ad” grid |
| URL | `/earn` |
| User sees | 2-column numbered tiles: locked / available / completed |
| API | `GET /tasks/earn`, `POST /tasks/earn/:id/complete` |
| Actions | Tap available tile → immediately complete |
| Auth | JWT |
| Telegram | None |
| Socket | None |
| Missing | **No ad SDK, no timer, no video.** Click = reward. On API failure, UI **locally marks the task completed and unlocks the next** without crediting a real wallet |

### 4.4 TopView

| Field | Detail |
|-------|--------|
| Purpose | Leaderboard |
| URL | `/top` |
| User sees | Podium (ranks 2, 1, 3) + list; amounts **masked** (`1***00`) |
| API | `GET /leaderboard` |
| Fallback | `fallbackLeaderboard()` from SYSTEM_ACCOUNTS |
| Socket | None (subtitle says “live” but there is no socket on this page) |
| Suspicious | Subtitle “በቀጥታ ይዘመናል” is not implemented. Real API synthesizes fake names if `users` is empty |

### 4.5 InviteView

| Field | Detail |
|-------|--------|
| Purpose | Referral link and stats |
| URL | `/invite` |
| User sees | 100 ETB banner; link; Telegram/WhatsApp/Messenger/Facebook share; copy/share; friends + earned |
| API | `GET /invite` |
| Auth | JWT |
| Telegram | Invite URL format `https://t.me/{BOT}/app?startapp=ref_{code}` requires BotFather Mini App short name **`app`** |
| Missing | Messenger share uses `app_id=0`. If `BOT_USERNAME` unset, URL contains `YourBot`. Frontend reward `100` is hardcoded separately from API `invite_reward` |
| Referral capture | Mini App `start_param` / `tgWebAppStartParam` / `?ref=` — **bot `/start` payload is not passed into upsert** |

### 4.6 WithdrawView

| Field | Detail |
|-------|--------|
| Purpose | Request payout + show community comments |
| URL | `/withdraw` |
| User sees | Min 2000 ETB; Ethiopia only; method chips; amount; phone/account; submit; feedback list |
| API | `POST /withdrawals`, `GET /feedback` |
| Methods (frontend hardcoded) | Telebirr, CBE Birr, Bank Transfer, M-Pesa Ethiopia, Amole, HelloCash, CBE, Dashen, Awash, Bank of Abyssinia |
| Auth | JWT |
| Missing | No withdrawal **history** API (History button only toggles feedback). Feedback is seed/fake; **users cannot post feedback**. Rating “4.8 (100)” is hardcoded. No payment execution |
| Country control | Toggle only shows Ethiopia; not a real country picker |

### 4.7 AdminDashboard

| Field | Detail |
|-------|--------|
| Purpose | Bingo-style admin console |
| URL | `/admin-dashboard` (outside AppShell; no tab bar) |
| Auth UI | **None.** Anyone can open the URL. API returns 403/401 if JWT is not admin (real mode) |
| Telegram | None |
| Socket | None |
| See Section 5 | Feature-by-feature |

### 4.8 API service (`frontend/src/services/api.js`)

Axios instance `/api`, 15s timeout, Bearer from `localStorage.gr_token`.

Functions and endpoints: `registerTelegram` POST `/auth/telegram`; `getMe`; social/earn task list+mutate; `getHomeFeed`; `getLeaderboard`; `getInviteStats`; `requestWithdraw`; `getCommunityFeedback`; admin: `getAdminStats`, `getAdminDashboard`, `listAdminUsers`, `listAdminWithdrawals`, `reviewWithdrawal`, `reviewAdminDeposit`, `searchAdminUser`, `updateUserBalance`, `saveAdminSettings`, `sendAdminBroadcast`, `sendAdminDm`, `saveSecondAdminCredentials`.

**Exported but unused by any Vue view:** `getAdminStats`, `listAdminUsers`, `listAdminWithdrawals` (dashboard uses the combined `/admin/dashboard` payload).

### 4.9 Socket service (`frontend/src/services/socket.js`)

`io({ path: '/socket.io', transports: ['websocket', 'polling'] })` — **no auth**, **no extra headers**. Used only by HomeView.

### 4.10 Telegram service (`frontend/src/services/telegram.js`)

If `window.Telegram.WebApp` exists: `ready()`, `expand()`, return true. Else stub object, return false. `getInitData()` / `getInitDataRaw()`.

---

## 5. Admin Dashboard

Route `/admin-dashboard`. Frontend: `AdminDashboard.vue`. Primary load: `GET /api/admin/dashboard`.

**Admin identification (real API):** JWT `is_admin` from `users.is_admin`, set when Telegram id is in `ADMIN_TELEGRAM_IDS` (or already true). **Never cleared.**

**Admin identification (demo API):** any valid JWT; demo auth always signs `is_admin: true`. Demo `requireAdmin` always calls `next()`.

There is **no** `/secondadmin` Vue route despite the hint in the UI.

### Feature table

| Feature | Frontend | Backend (real `api.js`) | Backend (demo `demoApi.js`) | Database | Status | Problems |
|---------|----------|-------------------------|-----------------------------|----------|--------|----------|
| Statistics (tasks by period) | Renders `stats.tasks.*` | **Hardcoded zeros** | Fake numbers (3, 5, 18, …) | Not queried | Partially implemented | Real mode shows 0 always. Demo is fake |
| Revenue by period | Renders `stats.revenue.*` | **Hardcoded zeros** | Fake numbers | No revenue/deposits table | Partially implemented | Not real revenue |
| Earn mode (social/ads/users) | Three counters | `social`/`ads` **hardcoded 0**; `users` = length of last 200 users | Derived from in-memory sets / fake users | `users` only (user count incomplete) | Partially implemented | Does not COUNT claims/completions |
| Financial deposits/withdrawals/balance | Three totals | `deposits: 0`; withdrawals = sum of last 100 **paid** rows (not all-time); balance = sum of last 200 users | In-memory sums / fallback 4200 | `withdrawals`, `users` | Partially implemented | Wrong aggregates; no deposits |
| User search | Phone / @username / ID | `GET /admin/users/search?q=` ILIKE + id/telegram_id | Search demo user list | `users` | Implemented but not verified | LIMIT 1; `%` wildcards; no exact @ strip |
| Edit balance | PATCH main/bonus | `PATCH /admin/users/:id/balance` | Updates demo user only if id===1 | `users` | Implemented but not verified | No NaN check; no ledger row; no audit |
| Transaction search | Button sets a message | **No endpoint** | **No endpoint** | None | Missing | Frontend: “wire verify API later” |
| Pending/failed/approved deposits | Tables + approve/reject | `POST /admin/deposits/:id/review` → **501** “Deposits table not enabled yet”; dashboard always empty arrays | In-memory deposits; approve credits `balance_main` | **No `deposits` table** | Frontend yes / backend missing (real) | Demo-only approve path |
| Pending/paid withdrawals | Tables + approve/reject | List in dashboard; `POST /admin/withdrawals/:id/review` paid\|rejected; reject refunds **`balance_main`** | Same against memory | `withdrawals`, `users`, `wallet_transactions` (refund) | Implemented but not verified | Live feed already posted at request time; reject refunds to main not original buckets; no “paid” payout API |
| Registered users | Sortable table, View | Dashboard `users` LIMIT 200 | Fake list from leaderboard | `users` | Implemented but not verified | Phone always empty; cap 200; `GET /admin/users` unused by UI |
| Deposit account settings | Form + Save | `PUT /admin/settings` **echoes body, persists nothing** | Mutates `state.settings` until process restart | **No settings table** | Partially implemented | Real: lie (“saved”). Telebirr verify key unused |
| Telebirr auto-verify / CBE proxy | Fields + checkbox | Ignored | Stored in memory only | None | Missing | Copied from Bingo UI |
| Broadcast | Message + optional amount + all/admins | `POST /admin/broadcast` `{ ok, queued: true }` **does not send Telegram, does not credit, does not store** | Pushes to `state.broadcasts`; may credit demo user | **No broadcasts table** | Partially implemented | Real: no-op. Demo: not Telegram |
| Recent broadcasts | Table | Dashboard `broadcasts: []` | In-memory list | None | Demo-only | Empty in real mode |
| Direct message | Phone or user id | `POST /admin/dm` **no-op queued** | Returns queued; no Telegraf call | None | Missing (real send) | Bot process is separate; no shared queue |
| Second admin credentials | Username/password | `PUT /admin/second-admin` **echo** | Memory `{ username, password }` | None | Missing | No `/secondadmin` route; demo default password in source |
| Admin authentication | Relies on JWT + `is_admin` | `adminRequired` | Any JWT | `users.is_admin`, env IDs | Partially implemented | Dashboard URL unguarded; demo everyone is admin |
| Admin permissions | None beyond binary is_admin | Same | Same | Boolean only | Missing | No roles |
| `GET /admin/stats` | Unused by dashboard | Real counts of users + withdrawal statuses | Fake | `users`, `withdrawals` | Implemented but not verified | UI does not call it |

**Whether operations “actually work”:** UNKNOWN — requires runtime verification. From code: **withdrawal review and user balance PATCH are the only admin writes that touch PostgreSQL.** Everything else is stub, 501, echo, or demo memory.

---

## 6. Backend API

Router mount: `app.use('/api', router)`. Prefix all paths with `/api`.

Two files implement the **same path list**. Which file is live is decided **once at process start** in `createApp()`:

```text
config.demoMode ? demoApiRouter : apiRouter
```

There is no per-request switch.

### Complete API reference (paths that exist in code)

| Method | Endpoint | Purpose | Auth | Admin | Database (real mode) | Status |
|--------|----------|---------|------|-------|----------------------|--------|
| GET | `/api/health` | Liveness JSON | No | No | None | Implemented but not verified. Does **not** check PG/Redis |
| POST | `/api/auth/telegram` | Validate initData (or bypass), upsert user, JWT | No (creates session) | No | `users`, maybe `wallet_transactions` via referrer payout | Partially implemented / potentially broken in prod if token empty (Section 8) |
| GET | `/api/me` | Current user | JWT | No | `users` | Implemented but not verified |
| GET | `/api/tasks/social` | Active social tasks + claimed flag | JWT | No | `social_tasks`, `social_task_claims` | Implemented but not verified |
| POST | `/api/tasks/social/:id/claim` | Credit bonus + claim row | JWT | No | users, claims, wallet_transactions | Implemented but not verified. **No join proof** |
| GET | `/api/tasks/earn` | Ordered earn tasks + lock state | JWT | No | `earn_tasks`, `earn_task_completions` | Implemented but not verified |
| POST | `/api/tasks/earn/:id/complete` | Credit if unlocked | JWT | No | users, completions, wallet_transactions | Implemented but not verified. **No ad proof** |
| GET | `/api/feed/withdrawals` | Last 20 live_feed rows | JWT | No | `live_feed` | Implemented but not verified. Fed at **request** time, not paid time |
| GET | `/api/leaderboard` | Top 20 `total_earned` | JWT | No | `users`, `withdrawals` count paid | Implemented but not verified. **Fake rows if empty** |
| GET | `/api/invite` | Friends, invite earnings, URL | JWT | No | `users`, `wallet_transactions` kind=`invite` | Implemented but not verified |
| POST | `/api/withdrawals` | Create pending withdrawal, deduct balances, insert live_feed, emit socket | JWT | No | users, withdrawals, wallet_transactions, live_feed | Implemented but not verified. **No payout** |
| GET | `/api/feedback` | Last 30 comments | JWT | No | `community_feedback` | Implemented but not verified. Seed-only; no POST |
| GET | `/api/admin/stats` | User + withdrawal counters | JWT | Yes | users, withdrawals | Implemented but not verified. Unused by UI |
| GET | `/api/admin/users` | Last 200 users | JWT | Yes | users | Implemented but not verified. Unused by UI |
| GET | `/api/admin/withdrawals` | Filter by `?status=` (default pending) | JWT | Yes | withdrawals ⋈ users | Implemented but not verified. Unused by UI |
| POST | `/api/admin/withdrawals/:id/review` | paid or rejected | JWT | Yes | withdrawals, users, wallet_transactions | Implemented but not verified |
| GET | `/api/admin/dashboard` | Combined admin payload | JWT | Yes | users, withdrawals | Partially implemented (zeros/stubs) |
| GET | `/api/admin/users/search` | First matching user | JWT | Yes | users | Implemented but not verified |
| PATCH | `/api/admin/users/:id/balance` | Set main/bonus | JWT | Yes | users only | Implemented but not verified |
| POST | `/api/admin/deposits/:id/review` | Intended deposit review | JWT | Yes | **None** — 501 | Missing |
| PUT | `/api/admin/settings` | Intended persist deposit accounts | JWT | Yes | **None** — echo | Missing persistence |
| POST | `/api/admin/broadcast` | Intended Telegram broadcast | JWT | Yes | **None** — echo | Missing |
| POST | `/api/admin/dm` | Intended Telegram DM | JWT | Yes | **None** — echo | Missing |
| PUT | `/api/admin/second-admin` | Intended second login | JWT | Yes | **None** — echo | Missing |

**No PUT/PATCH/DELETE user resources besides balance PATCH and settings PUT.** No REST for tasks CRUD, no user-facing deposit endpoints, no webhook endpoints.

### Flow (real mode)

`route in api.js` → inline SQL via `query()` or `pool.connect()` transactions → `pg`. There is **no** service or repository layer.

Demo mode: same HTTP shapes, `state` object in `demoApi.js`. Lost on restart.

### Health

- Demo: `{ status: 'ok', service: 'get-rewards', mode: 'demo' }`
- Real: `{ status: 'ok', service: 'get-rewards' }`

### Demo-specific behavior (not separate paths)

`POST /auth/telegram` ignores body and always returns the in-memory admin user. Deposit review **is** implemented in demo memory only.

---

## 7. Database

Schema lives only in `backend/src/db/migrate.js`. No numbered migration files. No `down` migrations.

### Process

```bash
cd backend && npm run migrate   # node src/db/migrate.js
```

1. `CREATE TABLE IF NOT EXISTS` + two `CREATE INDEX IF NOT EXISTS`
2. Seed if counts are 0
3. `pool.end()` and process exit

**Re-run safety:** Schema DDL is idempotent. Seeds check `COUNT(*) = 0` (or `username LIKE 'sys_%'`). Re-running **does not** duplicate seed **if the first seed succeeded**. It **does not** alter columns if you later change SQL — old databases will **not** get new columns. **No migration version table.**

### Tables

#### `users`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| telegram_id | BIGINT | UNIQUE NOT NULL |
| username | TEXT | |
| first_name, last_name | TEXT | |
| phone_number | TEXT | **Never written** by API or bot |
| referral_code | TEXT | UNIQUE NOT NULL |
| referred_by | INTEGER | FK → `users(id)` |
| balance_main | NUMERIC(12,2) | NOT NULL DEFAULT 0 |
| balance_bonus | NUMERIC(12,2) | NOT NULL DEFAULT 0 |
| total_earned | NUMERIC(12,2) | NOT NULL DEFAULT 0 |
| is_admin | BOOLEAN | NOT NULL DEFAULT FALSE |
| created_at, updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**Indexes:** UNIQUE telegram_id, UNIQUE referral_code, `idx_users_referral` on referral_code (redundant with UNIQUE).  
**Used by:** auth upsert, /me, tasks, invite, withdrawals, admin, bot /balance, leaderboard, referrer payout.  
**Seed:** 10 `sys_*` users, telegram_id `900001+`, referral `SYS0001+`, `total_earned` from SYSTEM_ACCOUNTS.

#### `social_tasks`

id PK; title_am NOT NULL; title_en DEFAULT ''; reward_etb NUMERIC default 100; url NOT NULL; once_only BOOLEAN default TRUE (**claim logic ignores this — always one claim row forever**); is_active default TRUE; created_at.  
**Seed:** one row, channel `https://t.me/GetRewardsChannel`.

#### `social_task_claims`

id PK; user_id FK users CASCADE; task_id FK social_tasks CASCADE; created_at; **UNIQUE(user_id, task_id)**.

#### `earn_tasks`

id PK; order_index INTEGER UNIQUE NOT NULL; titles; reward_etb default 10; task_type TEXT default `'ad'`; is_active.  
**Seed:** 8 DEFAULT_EARN_TASKS (15/15/20/20/25/25/30/30 ETB).

#### `earn_task_completions`

Same pattern as social claims; UNIQUE(user_id, task_id).

#### `withdrawals`

id PK; user_id FK CASCADE; amount NUMERIC NOT NULL; method TEXT; account TEXT; status TEXT default `'pending'` (**no CHECK**); created_at.  
**Index:** `idx_withdrawals_user`. **Missing:** index on `status`.  
Statuses used in code: `pending`, `paid`, `rejected`.

#### `live_feed`

id PK; name TEXT; amount; method; created_at. **No user_id, no withdrawal_id.** Denormalized social proof. Seeded from SYSTEM_ACCOUNTS last_withdraw. Also inserted on every user withdraw **request**.

#### `community_feedback`

id PK; name; message; rating INTEGER default 5; created_at. **No user_id.** Seeded from SYSTEM_ACCOUNTS. **No write API.**

#### `wallet_transactions`

id PK; user_id FK CASCADE; kind TEXT; amount NUMERIC (negative for withdraw); balance_after; meta JSONB default `{}`; created_at. **No index on user_id or kind.**  
Kinds in code: `social_task`, `earn_task`, `invite`, `withdraw`, `withdraw_refund`. Admin balance PATCH does **not** insert a row.

### Tables that the admin UI assumes but **do not exist**

`deposits`, `settings` / `system_settings`, `broadcasts`, `second_admins`, `transactions` (for CBE/Telebirr refs).

### Relationships (text ER)

```
users
  │
  ├── referred_by ─────────────┐
  │                            │
  ├── withdrawals
  ├── wallet_transactions
  ├── social_task_claims ──► social_tasks
  └── earn_task_completions ──► earn_tasks

live_feed                 (standalone; no FK)
community_feedback        (standalone; no FK)
```

### System / demo data

- SYSTEM_ACCOUNTS: 10 fictional Ethiopian names, fake earnings and withdrawal stories (Amharic messages).
- Welcome bonus: **+100 bonus + total_earned** on first Telegram upsert when balances are 0 (`auth.js`). Combined with seed sys users this means **new real users start with 100 ETB**.
- Demo mode does not use these tables at all.

### Production database risks

- Fake sys users and fake live_feed/feedback will appear as real social proof if you migrate a production DB with this seed.
- `CREATE TABLE IF NOT EXISTS` cannot evolve schema.
- Default `DATABASE_URL` in `config.js` includes a default password if env is missing.
- Pool has no `ssl` option (often required for managed PG; local/EC2 localhost usually OK).
- No backups in repo.
- Withdrawal `status` is unconstrained text.
- `phone_number` unused.
- `once_only` unused.
- Numeric balances compared in JS `Number()` (generally OK at 12,2).

---

## 8. Authentication and Security

### How users authenticate

1. Vue boot → `POST /api/auth/telegram` with Telegram `initData` (or null in browser).
2. Real API: `validateTelegramInitData` HMAC-SHA256 per Telegram WebApp spec; reject if older than 86400 seconds.
3. On success: `upsertTelegramUser` by `telegram_id`.
4. JWT signed with `JWT_SECRET`, 7 days, stored in **`localStorage` (`gr_token`)**. Axios sends `Authorization: Bearer`.
5. `authRequired` verifies JWT.

**Bypass (real `api.js`):** if initData is invalid/missing:

- If `NODE_ENV === 'production'` **AND** `config.telegramBotToken` is truthy → 401
- **Otherwise** create/upsert `demo_telegram_id` (default 1001) as `dev_user`

So: production with **empty** `TELEGRAM_BOT_TOKEN` still allows unauthenticated demo login. Development always allows it.

Demo router: **always** issues admin JWT for the in-memory user; **ignores** Telegram data.

### How admins authenticate

No separate admin password in real mode. `is_admin` is true if `String(telegram_id)` is in `ADMIN_TELEGRAM_IDS` (comma-separated). On existing users, `is_admin = users.is_admin OR $5` (sticky).

Demo: every token is admin.

UI `/secondadmin` **does not exist**. Second-admin username/password is **not** used to log in.

### JWT

- Library: jsonwebtoken
- Secret: `config.jwtSecret` = `JWT_SECRET` or fallback **`dev-only-change-me`** (`required()` never throws because fallback is set)
- Claims: `sub` (internal user id), `telegram_id`, `is_admin`
- Demo `is_admin` is hardcoded true in the sign call

### Telegram authentication

Implemented correctly in structure (data-check string, HMAC with `WebAppData`, timing-safe compare). **UNKNOWN — requires runtime verification** with a real bot token.

Bot `/start` upserts without referral payload.

### Admin Telegram IDs

From env `ADMIN_TELEGRAM_IDS`. Example in `.env.example` is a placeholder integer, not a live secret. **If empty, no user becomes admin via env** unless `is_admin` was already true.

### CORS

Allowlist includes `PUBLIC_URL`, `TELEGRAM_WEB_APP_URL`, localhost:5173, `CORS_ORIGINS` — then **every origin is allowed** (`return cb(null, true)` with comment to tighten later). Socket.IO `cors: { origin: true, credentials: true }`.

### Helmet

Enabled, but CSP off. Nginx HTTPS config adds `X-Frame-Options: SAMEORIGIN` which can **block Telegram Web / Desktop Mini App iframes**. Mobile WebView may still work. **Potentially broken** for Telegram Web.

### Secrets, passwords, tokens, cookies

- **Cookies:** not used.
- **localStorage:** JWT.
- **Passwords:** no user passwords. Demo second-admin password is hardcoded in `demoApi.js`.
- **`.env`:** not present in this clone (correctly gitignored).

**Do not print secret values.** Findings:

| Finding | Location | Documentation |
|---------|----------|----------------|
| JWT fallback secret | `backend/src/config.js` | Weak default if `JWT_SECRET` unset — treat as [SECRET FOUND - VALUE NOT DOCUMENTED] if a real `.env` is later added |
| Example bot token / JWT / DB URL | `backend/.env.example` | Placeholders, not production secrets |
| Default DATABASE_URL password | `config.js` fallback | [SECRET FOUND - VALUE NOT DOCUMENTED] as a default credential pattern |
| Demo second-admin password | `demoApi.js` `state.secondAdmin` | [SECRET FOUND - VALUE NOT DOCUMENTED] |
| Hardcoded Telegram IDs | None in source except example `123456789` in `.env.example` | Placeholder |
| Bot username in console | `backend/src/bot/index.js` logs `Open @taskEarn_9bot` | Hardcoded **username**, not a token |

### Vulnerabilities / production risks (summary)

See Section 18. Highest: DEMO_MODE in production, auth bypass, CORS `true`, unauthenticated Socket.IO, click-to-earn, claim-on-error UI, no rate limit, JWT in localStorage, stub admin money operations, nginx X-Frame-Options, welcome bonus + fake seed users.

---

## 9. Telegram Bot

| Item | Finding |
|------|---------|
| Framework | Telegraf 4.16.3 |
| Process | Separate from API: `npm run bot` / systemd `get-rewards-telegram-bot` |
| Username | Env `BOT_USERNAME` (used in invite URLs). Console also prints **`@taskEarn_9bot`**. **UNKNOWN** whether BotFather username matches |
| Token | `TELEGRAM_BOT_TOKEN` required; process exits if missing |
| Mode | **Long polling** (`bot.launch({ dropPendingUpdates: true })`). No webhook, no `setWebhook` |
| Commands | `/start`, `/app`, `/balance` (plus Telegraf default) |
| `/start` | Optional upsert (skipped in DEMO_MODE); then “Open Get Rewards” |
| Mini App button | `Markup.button.webApp('Open Get Rewards', webAppUrl)` **only if URL starts with `https://`**. Else replies with browser URL (local HTTP) |
| Web App URL | `TELEGRAM_WEB_APP_URL` or `PUBLIC_URL` or `http://localhost:5173` |
| Auth | Bot does not issue JWTs. Mini App uses initData → API |
| User creation | `/start` → `upsertTelegramUser` without `ctx.startPayload` (**referrals via bot deep link `/start ref_xxx` are dropped**) |
| `/balance` | Demo: tells user to open localhost:5173. Real: SELECT balances by `telegram_id` |
| Admin via bot | **None** |
| Error handling | `bot.catch` logs; upsert errors logged; balance errors reply generic text |
| Shutdown | SIGINT/SIGTERM `bot.stop` |

**How bot talks to backend/DB:** it does **not** HTTP-call Express. It imports `upsertTelegramUser` (which uses `pg`) and dynamically imports `pool` for `/balance`. API and bot are two Node processes sharing PostgreSQL.

**HTTPS dependency:** Telegram Mini App buttons **require HTTPS**. Local `http://localhost:5173` cannot be a WebApp button. Production needs `PUBLIC_URL` / `TELEGRAM_WEB_APP_URL` as HTTPS (sslip.io or domain) and BotFather Mini App URL + short name `app` (invite links use `/app?startapp=`).

**Long polling vs webhook:** Fine for a single EC2 process. Two bot processes would conflict. systemd is one unit — OK if only one replica.

---

## 10. Redis

| Question | Answer |
|----------|--------|
| Why used | README says “optional cache”. Code: **connect-only probe** |
| Config | `REDIS_URL` default `redis://127.0.0.1:6379/0`; `lazyConnect: true`, `maxRetriesPerRequest: 3` |
| Features that use it | **None.** `getRedis()` is only called from `index.js` start() |
| Required? | **No** for application logic. systemd `Wants=` redis but API still starts if Redis throws (caught, `console.warn`) |
| If unavailable | Demo mode: Redis is **not even connected**. Real mode: warning, API still listens |
| Production | Installing Redis on EC2 matches the Bingo-style diagram but **does not change app behavior** today. No Socket.IO Redis adapter (cannot scale API horizontally) |

---

## 11. Realtime / Socket.IO

### Server (`backend/src/index.js` + `realtime.js`)

- Same HTTP server as Express, path `/socket.io`
- CORS origin `true`
- On connection: emit `hello` `{ service: 'get-rewards', ts }`
- On `ping`: emit `pong`
- `getIo()?.emit('live_withdrawal', item)` from POST `/withdrawals` (both routers)

**No rooms. No JWT handshake. No Redis adapter.**

### Client

`getSocket()` once. HomeView `socket.on('live_withdrawal')` prepends to the list (max 20). **Does not listen to `hello`.** Unsubscribes on unmount (`off`), does **not** disconnect.

### What is realtime

Only **new withdrawal requests** (not paid confirmations). Top/Invite/Admin are not live.

### Failure

If Socket.IO fails, Home still loads REST feed. UNKNOWN — requires runtime verification of proxy (`vite` and nginx both define `/socket.io/`).

Nginx sets `Upgrade`/`Connection` and `proxy_read_timeout 86400` on `/socket.io/` — appropriate.

---

## 12. Environment Variables

Source of documented vars: `backend/.env.example`. Runtime load: `backend/src/config.js` → `backend/.env`.

### Table

| Variable | Purpose | Required locally | Required production | Example type | Security sensitive |
|----------|---------|------------------|---------------------|--------------|--------------------|
| DEMO_MODE | Swap demoApi vs api | No (default false in code if unset; **example sets true**) | **Must be false** | boolean string | No |
| NODE_ENV | morgan format; auth bypass gate | No (default development) | Yes (`production` also set in systemd) | `development`/`production` | No |
| PORT | Listen port | No (default 8000) | No if using default | number | No |
| HOST | Bind address | No (code default `0.0.0.0`; example `127.0.0.1`) | Prefer `127.0.0.1` behind Nginx | IP | No |
| PUBLIC_URL | Public origin (CORS list, docs) | For Mini App / CORS intent | Yes (real HTTPS origin) | URL | No |
| TELEGRAM_WEB_APP_URL | Mini App URL on bot button | Yes for real Telegram button | Yes HTTPS | URL | No |
| TELEGRAM_BOT_TOKEN | Bot + initData HMAC | Yes to run bot; yes for real auth | Yes | token | **Yes** |
| BOT_USERNAME | Invite t.me links | For working invite links | Yes | string | No (public) |
| JWT_SECRET | Sign/verify JWT | Should set; **has insecure fallback** | **Yes, strong random** | string | **Yes** |
| ADMIN_TELEGRAM_IDS | Comma-separated Telegram user ids | To see Admin link | Yes (at least one) | ids | Moderately (PII) |
| DATABASE_URL | pg connection | Yes if DEMO_MODE=false | Yes | URL | **Yes** |
| REDIS_URL | ioredis | Only if you want the connect log | Optional today | URL | If passworded, **Yes** |
| CORS_ORIGINS | Extra origins | No | Optional (currently unused because CORS allows all) | CSV URLs | No |

systemd also injects `NODE_ENV=production` and `PATH=...`.

### Expected by code but **not** in `.env.example`

None of the extra names. All `process.env.*` usages are the table above plus `DEMO_MODE === '1'`.

**Behavioral defaults not documented as “required”:** `JWT_SECRET` fallback `dev-only-change-me`; `DATABASE_URL` fallback with default password; `HOST` mismatch (example vs code).

---

## 13. Demo Mode

`config.demoMode` is true if `DEMO_MODE` is `true` (any case) or `1`.

`.env.example` sets **`DEMO_MODE=true`**.

### What `DEMO_MODE=true` does

- `app.js` mounts **`demoApi.js`**
- Logs `Running in DEMO_MODE (no PostgreSQL required)`
- API process **does not** connect Redis
- Bot **skips** user upsert on `/start`
- Bot `/balance` does not query PG
- All wallets, claims, withdrawals, deposits, broadcasts live in a **process-memory `state` object**
- Demo user is always **admin** (id 1, telegram_id 1001, 100 ETB bonus)
- Leaderboard/feed/feedback from SYSTEM_ACCOUNTS
- Second-admin credentials stored in memory only

### What is fake

Almost all product data: users, deposits, stats, revenue, live feed, feedback, leaderboard, invite friends (always 0 unless you change memory), broadcasts.

### What DB operations are bypassed

**All of them** for the API process. `migrate.js` is a separate command and is not implied by demo mode.

**Caveat:** the **bot process** still **imports** `auth.js` → `pool.js`, so a `pg.Pool` is constructed even in demo. If PostgreSQL auth fails, the bot may log pool errors even though `/start` skips upsert. UNKNOWN — requires runtime verification.

### What `DEMO_MODE=false` enables

PostgreSQL `api.js`: real users, tasks, ledger, withdrawals, admin subset. Redis connect attempt. Bot upsert + `/balance`.

### Has the app been fully tested with `DEMO_MODE=false`?

**Not in this repository** (no tests). **This audit did not run it.**

**Reported verification (from the requester, not from this audit):** PostgreSQL is **not fully configured; authentication is failing.** Therefore the project **cannot currently be assumed** to operate on real PostgreSQL in the local environment.

### Can it operate on real PostgreSQL?

**Code path exists** (`api.js` + `migrate.js`). **Operational status: UNKNOWN — requires runtime verification**, and currently **reported as blocked** by PG auth.

---

## 14. Deployment Configuration

Intended layout (PROJECT_GUIDE): `/home/ubuntu/get_rewards` on Ubuntu EC2.

### Nginx

- Listens 80 (and 443 in HTTPS file)
- **Does not serve Vue files itself** — proxies **everything** to Express `127.0.0.1:8000`
- Express then serves `frontend_dist` if present
- Placeholders: `YOUR_EC2_IP`, `YOUR-HOST.sslip.io`
- HTTPS file: Let’s Encrypt paths, HTTP→HTTPS redirect, `X-Frame-Options SAMEORIGIN`, `X-Content-Type-Options nosniff`
- **Must replace placeholders** before enable
- No `limit_req`, no upstream health check

### systemd

| Unit | Port | Notes |
|------|------|-------|
| get-rewards-api | from `.env` PORT (8000) | `Restart=always`; wants PG + Redis |
| get-rewards-telegram-bot | none (outbound Telegram) | Same env file |

If `.env` still has `DEMO_MODE=true`, **production systemd will run the in-memory API**. Critical.

`HOST=127.0.0.1` in the example is **correct** behind Nginx. If HOST is omitted, code binds `0.0.0.0` (API exposed besides Nginx).

### Deploy script

`scripts/deploy_update.sh`: `set -euo pipefail`; backend install+migrate; frontend install+build; restart both units. Does **not** copy nginx, does **not** certbot, does **not** set DEMO_MODE.

### Frontend build

`cd frontend && npm run build` → `taskEarnProject/frontend_dist/`. Express looks there. **This clone has no dist.**

### HTTPS / Telegram

Mini App and `webApp` button need public HTTPS. sslip.io is mentioned as in Bingo. Certbot not scripted beyond nginx include paths.

### Compare to intended AWS architecture

| Piece | Config present? | Ready? |
|-------|-----------------|--------|
| EC2 Ubuntu | Assumed; not IaC | Needs work |
| Nginx | Template with placeholders | Needs work |
| Vue | Build to dist, served by Express | Needs work (build + DEMO_MODE) |
| Express | systemd unit | Needs work (`DEMO_MODE`, secrets) |
| PostgreSQL | migrate script; local URL | **Not ready** (reported auth fail; no prod hardening) |
| Redis | installed/wanted; unused | Optional |
| Telegram bot | systemd long poll | Needs work (HTTPS URL, token, BotFather) |
| systemd | Two units | Needs work (paths, user ubuntu) |

---

## 15. Current Local Development

**Only commands that exist in package.json / docs / scripts.** This clone currently has **no `node_modules` and no `.env`.**

Documented in README / PROJECT_GUIDE:

### 1. Backend installation

```bash
cd backend
npm install
```

### 2. Frontend installation

```bash
cd frontend
npm install
```

### 3. Environment setup

```bash
cd backend
cp .env.example .env
```

Then edit `.env` (token, JWT, DB). Example defaults to **DEMO_MODE=true**.

### 4. PostgreSQL setup

**No script in the repo** creates the role `getrewards` or database `get_rewards`. You must create them yourself to match `DATABASE_URL`. **Not documented as exact SQL in package.json.** PROJECT_GUIDE does not include `createuser`/`createdb`.

### 5. Redis setup

**No repo command.** Optional. Default `redis://127.0.0.1:6379/0`.

### 6. Migration

```bash
cd backend
npm run migrate
```

Requires working `DATABASE_URL` even if you later run the API in demo mode. If PG auth fails, migrate exits 1.

### 7. Starting backend

```bash
cd backend
npm run dev
```

or `npm start`. Listens `HOST:PORT` (example 127.0.0.1:8000).

### 8. Starting frontend

```bash
cd frontend
npm run dev
```

Vite **http://localhost:5173** (PROJECT_GUIDE), proxies `/api` and `/socket.io` to 8000.

### 9. Starting Telegram bot

```bash
cd backend
npm run bot
```

Requires `TELEGRAM_BOT_TOKEN`. Other terminal than `npm run dev`.

### 10. Production build

```bash
cd frontend
npm run build
```

Preview: `npm run preview`. EC2 update (PROJECT_GUIDE):

```bash
cd ~/get_rewards/backend && npm install && npm run migrate
cd ~/get_rewards/frontend && npm install && npm run build
sudo systemctl restart get-rewards-api get-rewards-telegram-bot
```

Or `scripts/deploy_update.sh` on the server.

**Not in package.json:** lint, test, docker, webhook set.

---

## 16. What Is Currently Working

### Reported verification (requester / prior local notes — **not** re-run in this audit)

Label: **REPORTED, not personally verified.**

| Item | Reported result |
|------|-----------------|
| Backend health in DEMO_MODE | Works |
| Frontend | Works |
| Telegram bot | Runs |
| Redis | Responds to PONG |
| PostgreSQL | **Not fully configured; authentication failing** |

This clone: **no `.env`, no `node_modules`, no running servers in the inspected terminal** (`git clone` / `git status` only). So even those reports cannot be confirmed here.

### From source: appears implemented (NOT VERIFIED)

**VERIFIED (this audit):** none, except that the **files exist** and are internally consistent enough to describe.

**NOT VERIFIED (code exists):**

- Vue tabs and admin layout
- Axios + JWT header
- Demo in-memory earn/claim/withdraw
- Real SQL transactions for claim/complete/withdraw/referrer
- Telegraf /start /app /balance
- Socket emit on withdraw
- Helmet/morgan/cors wiring
- Nginx/systemd templates
- Health JSON shape

Do not treat “code exists” as “works with DEMO_MODE=false”.

---

## 17. What Is Missing

### Admin: frontend without real backend

Deposits, settings persistence, broadcast/DM send, second-admin login, task/revenue stats, transaction search, Telebirr verify, CBE proxy.

### Frontend API helpers without matching persistence

`reviewAdminDeposit` → 501 in real mode. `saveAdminSettings` / `sendAdminBroadcast` / `sendAdminDm` / `saveSecondAdminCredentials` → echo.

### Backend endpoints unused by UI

`GET /admin/stats`, `GET /admin/users`, `GET /admin/withdrawals` (dashboard bundles data instead).

### Database without API

`community_feedback` has no POST. `phone_number` never set. `once_only` unused. `task_type` unused.

### Buttons / forms without implementation

- Withdraw “History” ≠ withdrawal history
- Transaction search
- Second admin “used at /secondadmin”
- Earn tiles as ads
- Social “join then claim” without membership check
- Country selector (Ethiopia only)

### Demo functionality that must not ship

`DEMO_MODE`, SYSTEM_ACCOUNTS, leaderboard fake fill, frontend fallbacks, Home/Earn **optimistic complete on error**, welcome +100 ETB, live_feed on pending withdraw.

### Hardcoded data

Channel URL, min withdraw 2000, invite 100, methods list, `@taskEarn_9bot`, `GetRewardsChannel`, `demo_telegram_id: 1001`, Messenger `app_id=0`, feedback rating 4.8 (100), demo second admin.

### Missing production concerns

Tests, lint, rate limit, structured logging, metrics, backups, health that checks PG, webhook option, SSL for pg, schema migration versioning, ad network, payout rail, deposit flow, phone collection, BotFather docs, Node version pin, `engines` field.

### Authz gaps

Admin page has no client guard. Socket.IO open. CORS open. Demo admin for everyone.

---

## 18. Bugs / Risks / Suspicious Code

### CRITICAL

**1. Shipping with DEMO_MODE=true**  
Location: `backend/.env.example`, `app.js` router swap.  
Why: In-memory balances; lost on restart; everyone admin; no real accounting.  
Fix: Production `.env` must set `DEMO_MODE=false`; refuse to start in production if demo is on.

**2. Telegram auth bypass**  
Location: `backend/src/routes/api.js` POST `/auth/telegram`.  
Why: If not (`production` AND bot token), anyone can mint a JWT as telegram id 1001 (or chosen `demo_telegram_id`). Empty token in production still bypasses.  
Fix: Require valid initData whenever a bot token is configured; never upsert a client-supplied demo id in production.

**3. Earn/social rewards without proof**  
Location: `POST /tasks/earn/:id/complete`, `POST /tasks/social/:id/claim`; EarnView/HomeView.  
Why: Direct click pays ETB. Attackers drain bonus → withdraw at 2000.  
Fix: Ad network S2S callback; Telegram `getChatMember`; rate limits; fraud rules; do not pay before proof.

**4. UI treats API failure as success**  
Location: `HomeView.vue` `claimSocial` catch; `EarnView.vue` `onTask` catch.  
Why: Users think they claimed/completed; wallet may be unchanged.  
Fix: Show error; do not set `claimed`/`completed` locally.

**5. PostgreSQL not proven / reported auth failure**  
Location: ops / `DATABASE_URL`.  
Why: Real mode cannot run.  
Fix: Create role/database matching URL; `pg_hba.conf`; test `npm run migrate`.

### HIGH

**6. Weak JWT secret fallback**  
`config.js` `dev-only-change-me`. Forged admin JWTs if secret leaked or default used.

**7. CORS always allow**  
`app.js`. Any website can call the API with a stolen JWT (and CORS will not stop browser calls from attacker origins).

**8. Unauthenticated Socket.IO**  
Clients can connect and will receive `live_withdrawal` (PII: full names on feed).

**9. Live feed on pending withdraw + full names**  
`api.js` POST `/withdrawals`. Fake “paid” social proof; privacy.

**10. Admin stubs that return ok**  
settings/broadcast/DM/second-admin. Operators believe money or messages were sent.

**11. Nginx `X-Frame-Options: SAMEORIGIN`**  
`get_rewards_https.conf`. Telegram Web Mini App may fail to embed.

**12. Welcome +100 ETB + seed fake rich users**  
Inflates leaderboard and liabilities.

**13. No rate limiting** on claim/complete/withdraw/auth.

**14. Rejected withdrawal refunds to `balance_main` only**  
If deducted from bonus, reject inflates main.

**15. Bot `/start` drops referral payload**  
`ctx.startPayload` not passed to upsert.

### MEDIUM

**16. PATCH balance without finite-number validation** — can write NaN.  
**17. PATCH balance has no wallet_transactions row.**  
**18. `once_only` ignored** — but unique claim already once-only; daily tasks cannot work.  
**19. Leaderboard fake data if no users.**  
**20. Health does not check DB.**  
**21. Pool created by bot even in demo** — noise / start issues if PG down.  
**22. Invite URL `/app` short name not documented in BotFather setup.**  
**23. Hardcoded `@taskEarn_9bot` vs env `BOT_USERNAME`.**  
**24. Missing indexes** on `withdrawals(status)`, `wallet_transactions(user_id, kind)`.  
**25. `listAdminUsers` LIMIT 200** — silent truncation.  
**26. Dashboard paid total is sum of last 100 paid rows, not SQL SUM all.**  
**27. Messenger share `app_id=0`.**  
**28. JWT in localStorage** — XSS would steal sessions (no CSP).  
**29. Codegen scripts can overwrite production source if run.**  
**30. No CHECK on withdrawal status.**

### LOW

**31. `withClient` unused.**  
**32. Duplicate `makeReferralCode` in migrate.js (exported, unused by API).**  
**33. Top page claims “live” without sockets.**  
**34. Feedback stars always 5 in UI regardless of `rating`.**  
**35. `HOST` default mismatch between example and config.js.**  
**36. axios 1.19.0 vs range ^1.6.2 — lockfile is what installs; still no audit of CVEs in this pass.**

---

## 19. Production Readiness

| Area | Rating | Notes |
|------|--------|-------|
| Backend | **NEEDS WORK** | Two modes; stubs; no tests |
| Frontend | **NEEDS WORK** | UI complete; fallbacks/fake success; no guards |
| PostgreSQL | **NOT READY** | Reported auth failure; seed risk; no backups |
| Redis | **UNKNOWN** | Connect-only; reported PONG is not app usage |
| Authentication | **NOT READY** | Bypass; weak JWT default; demo admin |
| Telegram | **NEEDS WORK** | Long poll OK; HTTPS Mini App + BotFather unknown |
| Admin dashboard | **NOT READY** | Majority not persisted / not sent |
| Security | **NOT READY** | CORS, CSRF/n/a, no rate limit, CSP off, secrets |
| Nginx | **NEEDS WORK** | Placeholders; X-Frame-Options |
| systemd | **NEEDS WORK** | Paths assume ubuntu@/home/ubuntu/get_rewards |
| Environment | **NOT READY** | Example is demo; no prod checklist in .env |
| Logging | **NEEDS WORK** | morgan + console; journald only |
| Error handling | **NEEDS WORK** | Generic 500; UI swallows errors |
| Backups | **NOT READY** | None |
| Monitoring | **NOT READY** | Health is shallow |
| HTTPS | **NOT READY** | Template only |
| CORS | **NOT READY** | Allow all |
| Database migrations | **NEEDS WORK** | Idempotent create, not evolvable |

**Overall: NOT READY for production.**

---

## 20. AWS EC2 Deployment Checklist

Target: **one EC2 VM**, Ubuntu, **no** ECS/Docker/CDK/Terraform.

### EC2 preparation

- Ubuntu LTS, sized for Node + Nginx + Postgres + Redis
- Elastic IP or stable DNS / sslip.io
- Disk for PG data + logs

### SSH

- Key-only SSH, disable password auth
- Security group: 22 from your IP; 80/443 public; **do not** expose 8000, 5432, 6379

### Node.js

- Install a current LTS (repo does not pin; 20 or 22 is a reasonable choice — **UNKNOWN which was used in development**)
- Confirm `/usr/bin/node` matches systemd `ExecStart`

### PostgreSQL

- `apt install postgresql`
- Create database/user matching `DATABASE_URL` (name `get_rewards`, user `getrewards` in the example)
- `pg_hba.conf`: local scram/md5 for that user
- **Do not** use the example password on the internet
- Bind localhost only

### Redis

- `apt install redis-server`
- Bind 127.0.0.1; optional requirepass then put it in `REDIS_URL`
- Optional until you actually cache

### Git / clone

```bash
# on EC2 as ubuntu — documented intent, not a repo script
cd ~
git clone https://github.com/Fishxo/taskEarnProject.git get_rewards
```

systemd expects **`/home/ubuntu/get_rewards`**.

### Environment

```bash
cp ~/get_rewards/backend/.env.example ~/get_rewards/backend/.env
```

Set:

- `DEMO_MODE=false`
- `NODE_ENV=production` (also in unit)
- `HOST=127.0.0.1`
- `PORT=8000`
- Strong `JWT_SECRET`
- Real `TELEGRAM_BOT_TOKEN`, `BOT_USERNAME`
- `PUBLIC_URL` and `TELEGRAM_WEB_APP_URL` = `https://YOUR-HOST`
- `ADMIN_TELEGRAM_IDS`
- Real `DATABASE_URL`
- `CORS_ORIGINS` (still must **change code** to honor the allowlist)

### Database / migrate

- Create DB/user
- `cd ~/get_rewards/backend && npm install && npm run migrate`
- Decide whether to **delete sys_* users and seed live_feed/feedback** before going live

### Backend / bot startup

```bash
sudo cp systemd/get-rewards-api.service /etc/systemd/system/
sudo cp systemd/get-rewards-telegram-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now get-rewards-api get-rewards-telegram-bot
```

### Vue build

```bash
cd ~/get_rewards/frontend && npm install && npm run build
```

Confirm `~/get_rewards/frontend_dist/index.html` exists, then restart API.

### Nginx

- Install nginx
- Copy `nginx/get_rewards.conf`, replace server_name
- `ln -s` sites-enabled; `nginx -t`; reload
- After DNS: certbot; switch to edited `get_rewards_https.conf`
- Revisit **X-Frame-Options** for Telegram Web (`frame-ancestors` for `https://web.telegram.org` / `https://*.telegram.org`)

### Telegram Mini App

- BotFather: bot token, `/newapp` or Menu Button, Web App URL = HTTPS site
- Short name **`app`** if you keep invite URLs as `t.me/<bot>/app?startapp=ref_...`
- Set domain for the Mini App
- Test `/start` button (HTTPS only)

### Firewall / security group

- UFW: 22, 80, 443
- No public 5432/6379/8000

### Testing

- `curl -sS https://HOST/api/health`
- Open Mini App from Telegram (not only desktop Chrome)
- One real user upsert, claim, earn, withdraw **without** paying out until review works
- Admin JWT `is_admin`
- Socket through wss `/socket.io`

### Logs / recovery

```bash
journalctl -u get-rewards-api -f
journalctl -u get-rewards-telegram-bot -f
sudo tail -f /var/log/nginx/get_rewards_error.log
sudo systemctl restart get-rewards-api get-rewards-telegram-bot
```

`Restart=always` with burst limits is already in units.

### Do not do until code is fixed

- Enable real withdrawals of value
- Point a large audience at DEMO_MODE
- Trust admin Save Settings / Broadcast

---

## 21. Troubleshooting Guide

### Backend won't start

**Symptoms:** no listen log; systemd failed.  
**Causes:** missing `backend/.env`; `JWT_SECRET` actually empty without fallback if code changes; port in use; syntax error.  
**Inspect:** `backend/src/index.js`, `config.js`, unit file.  
**Check:** `journalctl -u get-rewards-api -e`; `ss -lptn | grep 8000`.  
**Fixes:** create `.env`; free port 8000; `node src/index.js` in WorkingDirectory.

### PostgreSQL connection refused

**Symptoms:** migrate `ECONNREFUSED`; API 500s in real mode.  
**Causes:** postgres down; wrong host/port.  
**Inspect:** `DATABASE_URL`, `pool.js`.  
**Check:** `sudo systemctl status postgresql`; `ss -lptn | grep 5432`.  
**Fixes:** start postgres; use 127.0.0.1.

### PostgreSQL authentication failed

**Symptoms:** `password authentication failed for user "getrewards"` (this is the **reported** local blocker).  
**Causes:** user/password mismatch; `pg_hba.conf`; peer vs md5.  
**Inspect:** `DATABASE_URL` in `.env` (do not commit it); Postgres roles.  
**Check:** `sudo -u postgres psql -c '\du'`; Postgres log.  
**Fixes:** `CREATE USER` / `ALTER USER ... PASSWORD`; matching `pg_hba`; recreate URL. Do not run migrate until this works.

### Redis connection failed

**Symptoms:** `Redis not available yet:` warning.  
**Causes:** redis down; wrong URL.  
**Inspect:** `backend/src/db/redis.js`, `index.js`.  
**Check:** `redis-cli ping` (reported PONG locally).  
**Fixes:** start redis. App should still serve.

### Telegram bot not responding

**Symptoms:** no reply to `/start`.  
**Causes:** no token; bot process down; another poller; network.  
**Inspect:** `backend/src/bot/index.js`.  
**Check:** `journalctl -u get-rewards-telegram-bot`; process list for other `telegraf`.  
**Fixes:** one poller only; valid token; `dropPendingUpdates` already true.

### Telegram Mini App doesn't open

**Symptoms:** no button, or WebApp fails.  
**Causes:** HTTP URL (code skips webApp button); BotFather URL wrong; X-Frame-Options; frontend_dist missing.  
**Inspect:** `TELEGRAM_WEB_APP_URL`, bot `isHttps()`, nginx HTTPS file, `app.js` static.  
**Fixes:** HTTPS; build frontend; BotFather domain; loosen framing for Telegram.

### CORS error

**Symptoms:** browser blocks `/api`.  
**Causes:** Unexpected because code allows all origins; more likely mixed content or wrong host.  
**Inspect:** `app.js` cors.  
**Fixes:** if you tighten CORS later, include the Mini App origin and `https://web.telegram.org` as needed.

### Vue API requests fail

**Symptoms:** Network error / 404 / HTML instead of JSON.  
**Causes:** backend down; Vite proxy; production without `/api` proxy; JWT 401.  
**Inspect:** `frontend/vite.config.js`, `api.js`, nginx.  
**Check:** `curl http://127.0.0.1:8000/api/health`.  
**Fixes:** start API; in prod, Nginx must reach Express.

### Socket.IO doesn't connect

**Symptoms:** feed never live-updates.  
**Causes:** proxy missing Upgrade; path mismatch.  
**Inspect:** nginx `location /socket.io/`, `vite.config.js`, `socket.js`.  
**Check:** browser WS to `/socket.io`.  
**Fixes:** keep dedicated location; don't run two conflicting path rewrites.

### Nginx 502

**Symptoms:** 502 Bad Gateway.  
**Causes:** API down; HOST bind; wrong proxy_pass.  
**Inspect:** nginx conf; systemd API.  
**Check:** `curl 127.0.0.1:8000/api/health`; error.log.  
**Fixes:** start API; HOST=127.0.0.1.

### Nginx 404

**Symptoms:** SPA routes 404.  
**Causes:** Express has no dist; catch-all not hitting.  
**Inspect:** `app.js` `frontendDist`, `frontend_dist/`.  
**Fixes:** `npm run build`; restart API. Dev: use Vite 5173 not nginx.

### systemd service fails

**Symptoms:** `activating (auto-restart)`.  
**Causes:** path `/home/ubuntu/get_rewards` wrong; `.env` missing; node path; User=ubuntu.  
**Inspect:** unit files.  
**Check:** `systemctl status`; `journalctl -u ...`.  
**Fixes:** match clone path; EnvironmentFile exists.

### Migration fails

**Symptoms:** `npm run migrate` exit 1.  
**Causes:** PG auth; SQL error.  
**Inspect:** `migrate.js`.  
**Check:** stderr from the script.  
**Fixes:** fix DB login first.

### JWT authentication fails

**Symptoms:** 401 Invalid or expired token.  
**Causes:** secret changed; expired 7d; no header.  
**Inspect:** `auth.js`, `api.js` interceptor.  
**Fixes:** same `JWT_SECRET` on API+bot machines (single VM); re-open Mini App to re-auth.

### Admin authentication fails

**Symptoms:** dashboard “Admin access required”.  
**Causes:** `is_admin` false; not in `ADMIN_TELEGRAM_IDS`; demo vs real.  
**Inspect:** `adminRequired`, env, users row.  
**Fixes:** set env and re-login (existing users OR-in admin on upsert). Dashboard has no login form.

---

## 22. Project Status Summary

### A. WORKING (code-complete; runtime mostly NOT VERIFIED)

- Vue 5-tab Mini App shell and Admin layout
- Express + Socket.IO process structure
- Telegraf long-polling bot structure
- Dual API (demo vs postgres) with parallel routes
- JWT + Telegram HMAC implementation (with bypass)
- SQL schema + seed script
- Nginx/systemd/deploy templates
- Health endpoint shape
- In-memory demo earn/claim/withdraw **if** DEMO_MODE and processes run (reported locally)

### B. PARTIALLY WORKING

- Admin dashboard (UI rich, PG writes: withdrawal review + balance only)
- Referrals (Mini App start_param yes; bot /start payload no)
- Live feed (socket + table, but pending≠paid, seeded fakes)
- Leaderboard (real query + fake fallback)
- Production Nginx (placeholders)
- Redis (installed/connected, unused)

### C. NOT IMPLEMENTED

- Real ads
- Channel membership verification
- User deposits + deposits table
- Payout execution (Telebirr/CBE/banks)
- Broadcast/DM actually sent via Bot API
- Settings persistence
- Second-admin login page
- Transaction reference search / Telebirr verify / CBE proxy
- User-generated feedback
- Phone number collection
- Tests, monitoring, backups, rate limits
- Webhooks
- Schema evolution tool

### D. BUGS/RISKS

See Section 18. Highest: demo mode, auth bypass, unpaid-click rewards, UI success-on-error, open CORS, stub admin OKs, PG auth, Mini App framing.

### E. NEEDS TESTING

Everything under `DEMO_MODE=false`: migrate, auth with real initData, claim/complete/withdraw transactions, admin review refund, Socket through Nginx, HTTPS Mini App, invite startapp, systemd restart, bot + API together.

### F. PRODUCTION BLOCKERS

1. `DEMO_MODE` default / risk of running demo in systemd  
2. PostgreSQL not operational (reported)  
3. Auth bypass + weak JWT default  
4. Economic exploits (ads/social not verified)  
5. Admin features that fake success  
6. No payout or deposit rails (if those are in-scope for v1, withdrawals are still unpaid IOU records)  
7. Secrets and CORS  
8. Fake seed users / live_feed  
9. No backups/monitoring  
10. HTTPS + BotFather + framing not finished in templates  

### G. AWS DEPLOYMENT BLOCKERS

- Placeholders `YOUR-HOST.sslip.io` / `YOUR_EC2_IP`  
- systemd path `ubuntu` / `/home/ubuntu/get_rewards`  
- Need real `.env` with DEMO_MODE=false  
- Must `npm run build` so Express has `frontend_dist`  
- Certbot not automated  
- PG user creation not in repo  
- Node version not specified  
- X-Frame-Options vs Telegram Web  
- Redis/Postgres “Wants” do not fix app readiness  

---

## 23. Important Architecture Summary

**Intended production (Bingo-style single VM):**

```
User (Telegram client)
        │
        │  Mini App HTTPS
        ▼
     Vue SPA  (built files in frontend_dist)
        │
        ▼
      Nginx  :80/:443
        │  proxy_pass
        ▼
   Express :8000
        ├── PostgreSQL     (users, tasks, wallet, withdrawals)
        ├── Redis          (connected, unused)
        ├── Socket.IO      (live_withdrawal)
        └── static Vue

   Telegram Bot (separate Node process, long polling)
        ├── Telegram Bot API (outbound)
        └── PostgreSQL (upsert, /balance)
```

**Major data flows**

1. **Auth:** Telegram initData → Express → HMAC → upsert `users` → JWT → `localStorage`.  
2. **Earn/social:** Vue POST → SQL transaction → `balance_bonus` + `wallet_transactions` + claim/completion row.  
3. **Invite:** start_param `ref_*` → `referred_by` → `maybePayReferrer` 100 ETB.  
4. **Withdraw:** Vue POST → deduct balances → `withdrawals.pending` → `live_feed` + Socket.IO. Admin later paid/rejected.  
5. **Bot:** Telegram update → Telegraf → optional PG; button opens Vue URL.

**What actually runs locally if you follow `.env.example`:** Express **demo router** (RAM), optional bot, Vue via Vite proxy. PostgreSQL **not** in the request path.

---

## 24. Documentation Quality Notes for the Next Developer

- README/PROJECT_GUIDE describe the **intended** product and Bingo-like deploy. They **do not** warn that most of the admin panel is stubbed in real mode or that DEMO_MODE is the example default.
- There are **no tests** and **no OpenAPI spec**. This file is the first full map.
- Codegen under `backend/scripts/` can silently regenerate Vue/API files; treat those scripts as historical, not a build step.
- Dual maintenance: **every endpoint must be updated in both `api.js` and `demoApi.js`** or demo/prod will drift.

---

## TOP 10 THINGS TO FIX/VERIFY BEFORE AWS DEPLOYMENT

1. **Turn off DEMO_MODE in production and prove `GET /api/health` + `GET /api/me` against PostgreSQL** — fix role/password/`pg_hba` first (`npm run migrate` must succeed).  
2. **Close Telegram auth bypass** — invalid initData must 401 whenever the bot token is set; never honor `demo_telegram_id` in production.  
3. **Set a strong `JWT_SECRET`** — do not deploy the fallback or the example string.  
4. **Stop paying for unproven tasks** — do not enable withdrawals of value until ads and channel-join are verified (or disable complete/claim in prod).  
5. **Fix Home/Earn error handlers** so failed API calls are not shown as success.  
6. **Make admin writes honest** — persist settings, implement or remove deposits/broadcast/DM/second-admin; never return `{ ok: true }` for no-ops.  
7. **Strip or isolate seed fakes** — sys users, live_feed, community_feedback, leaderboard placeholders.  
8. **Finish HTTPS Mini App** — real host, certbot, BotFather Web App URL + `app` short name; fix `X-Frame-Options` for Telegram Web.  
9. **Tighten CORS and Socket.IO** — honor `CORS_ORIGINS`; authenticate sockets; bind API to 127.0.0.1.  
10. **Add operational basics** — rate limits on money routes, PG backups, health that checks the database, confirm systemd paths and `frontend_dist` after `npm run build`.

---

*End of PROJECT_REFERENCE.md. Audit based on repository contents as of 2026-08-17. Runtime labels marked UNKNOWN or REPORTED were not independently verified in this pass.*
