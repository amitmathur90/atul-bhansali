# Admin Portal — Atul Bhansali Citizen Connect

React + Vite admin/staff web app. Staff, MLA, and Super Admin all log in here; the UI adapts to
the logged-in role (see `src/components/layout/AppShell.tsx`'s `NAV_ITEMS`).

## Local setup

```bash
cp .env.example .env   # VITE_API_BASE_URL — defaults to http://localhost:4100/api
npm run dev             # http://localhost:5173
```

Requires the backend running (see `../backend/README.md`) and seeded — log in with `admin` /
`ChangeMe123!`, `mla` / `MlaChangeMe123!`, or `staff1` / `StaffChangeMe123!`.

## Role → page access

| Page | Staff | MLA | Super Admin |
|---|---|---|---|
| My Complaints (own assigned queue) | ✅ | – | – |
| Dashboard, Complaints, Reports, Announcements, Development Projects, Emergency Contacts, Settings | – | ✅ | ✅ |
| Citizens, Staff Management | – | Citizens only | ✅ |
| Categories / Wards / Departments | – | – | ✅ |

Role gating happens in two places that must stay in sync: `AppShell.tsx` (which nav links render)
and the backend's `requireRole(...)` middleware on each route (the actual enforcement — the
frontend gating is only a UX convenience, never treat it as the security boundary).

## Stack notes

- **Tailwind v4** via `@tailwindcss/vite` — no `tailwind.config.js` needed, content is auto-detected.
- **TanStack Query** for all server state; **Zustand** (`src/store/authStore.ts`) for the persisted
  auth session (access/refresh tokens + logged-in staff profile, in `localStorage`).
- `src/lib/api-client.ts` — axios instance with an interceptor that transparently refreshes the
  access token on a 401 and retries the original request once.
- **Vite `resolve.dedupe`** in `vite.config.ts` is load-bearing: this is an npm workspace where
  `mobile-app` pins an older React version for Expo compatibility, which without the dedupe/alias
  config causes a duplicate-React "Invalid hook call" (blank page, no visible error). Don't remove it.
