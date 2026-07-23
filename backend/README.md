# Backend — Atul Bhansali Citizen Connect

Node.js + Express + TypeScript API, Prisma ORM, PostgreSQL.

## Local setup

```bash
cp .env.example .env
# edit .env — set DATABASE_URL to a Postgres database you can create tables in

npm run prisma:migrate   # creates tables from prisma/schema.prisma
npm run prisma:seed      # wards, categories, departments, emergency contacts, a super admin + sample MLA/staff login
npm run dev              # http://localhost:4100 (tsx watch)
```

Seeded logins (from `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD` in `.env`, plus two extra sample
accounts hardcoded in `prisma/seed.ts` for local testing):

| Role | Username | Password |
|---|---|---|
| Super Admin | `admin` (env-configurable) | `ChangeMe123!` (env-configurable) |
| MLA | `mla` | `MlaChangeMe123!` |
| Staff | `staff1` | `StaffChangeMe123!` |

Citizens log in with phone + OTP — in dev, the OTP is logged to the server console and echoed
back in the `/auth/otp/request` response body as `devOtp` (never in production, gated by `NODE_ENV`).

## Pluggable providers

Every external integration is behind an interface with a console/local dev default, selected by
env var — see `.env.example`. Swapping to a real provider means writing one new class and flipping
the env var; nothing else in the codebase changes.

| Concern | Env var | Dev default | Real option |
|---|---|---|---|
| SMS OTP delivery | `SMS_PROVIDER` | `console` (logs to stdout) | `twilio` / `msg91` (not yet implemented — see `src/modules/auth/sms/`) |
| File storage | `STORAGE_PROVIDER` | `local` (disk, served at `/uploads`) | `s3` / `cloudinary` (not yet implemented — see `src/storage/`) |
| Push notifications | `PUSH_PROVIDER` | `console` (logs payload) | `expo` (implemented — see `src/modules/notifications/push/expo-push.provider.ts`) |

## Scripts

- `npm run dev` — start with hot reload
- `npm run typecheck` — `tsc --noEmit`
- `npm run prisma:migrate` — apply schema changes
- `npm run prisma:seed` — reseed lookup/demo data
- `npm run prisma:studio` — browse the database in a GUI

## Project layout

`src/modules/<name>/` holds one feature per folder (routes + controller + service, following that
naming when a module is nontrivial). `src/lib/` is shared infrastructure (Prisma client, JWT,
error types). `src/middleware/` is Express middleware (auth, upload, rate-limit, error handling).
`src/storage/` and `src/modules/*/[sms|push]/` are the pluggable-provider interfaces described above.
