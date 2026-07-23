# Atul Bhansali Citizen Connect

A grievance/complaint management platform connecting citizens to the MLA's office: a citizen
mobile app, an admin web portal (staff/MLA/super admin), and the backend API + database serving
both.

## What's built

- **Citizens (mobile app)**: phone+OTP login/registration, file a complaint (photo + GPS,
  category/ward/priority), track it through a full status timeline, leave feedback once resolved,
  browse announcements and development-works updates, tap-to-call emergency contacts, contact the
  MLA office, and receive push notifications on every status change — including while offline
  (queued complaint submissions flush automatically once connectivity returns).
- **Staff**: log into the admin portal, see their assigned-complaint queue, move complaints through
  Received → Assigned → In Progress → Completed/Rejected with remarks.
- **MLA / Super Admin (admin portal)**: dashboard analytics, full complaint management
  (search/filter/assign/export), citizen management (block/history), staff management (create,
  assign wards & categories, performance stats), announcements, development-projects with photo
  galleries, emergency contacts, reports (daily/weekly/monthly/yearly, ward-wise, category-wise,
  officer-wise) with Excel/PDF export, and lookup management (categories/wards/departments).

Everything above runs fully locally today — no external accounts needed to develop or demo it. See
**[DEPLOYMENT.md](DEPLOYMENT.md)** for exactly what's needed to take it to a real public launch.

## Layout

- `backend/` — Node.js + Express + TypeScript API, Prisma ORM, PostgreSQL ([README](backend/README.md))
- `admin-portal/` — React + Vite admin/staff web app ([README](admin-portal/README.md))
- `mobile-app/` — React Native (Expo) citizen app ([README](mobile-app/README.md))
- `packages/shared/` — TypeScript enums, zod schemas, and DTOs shared by all three apps

## Local setup

```bash
npm install                     # installs all workspaces
cp backend/.env.example backend/.env
cp admin-portal/.env.example admin-portal/.env
cp mobile-app/.env.example mobile-app/.env
# edit backend/.env — set DATABASE_URL to a Postgres database you can create tables in
# (docker-compose.yml is here as an optional alternative to a native Postgres install)

npm run dev --workspace=backend        # http://localhost:4100
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend

npm run dev:admin                       # http://localhost:5173
npm run dev:mobile                      # Expo dev server — scan the QR with Expo Go
```

See each app's own README for details, seeded login credentials, and app-specific notes.

## Architecture at a glance

- **Auth**: citizens use phone + OTP (custom, provider-agnostic); staff/MLA/super-admin use
  username + password. Both issue short-lived JWT access tokens + rotating refresh tokens.
- **Every external integration is behind a pluggable interface** with a local/console dev default:
  SMS OTP delivery, file storage, and push notifications each have an env var
  (`SMS_PROVIDER` / `STORAGE_PROVIDER` / `PUSH_PROVIDER`) that swaps the implementation with zero
  changes to the rest of the codebase — see `backend/README.md` for the full table.
- **Monorepo**: npm workspaces. `mobile-app` pins an Expo-compatible React version that differs
  from `admin-portal`'s, which is why `admin-portal/vite.config.ts` has an explicit React
  dedupe/alias — removing it reintroduces a duplicate-React bug (blank page, no error).
