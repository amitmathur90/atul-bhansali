# What's left before this goes live

Everything in this repo runs today, fully functional, against console-logged OTPs, local-disk file
storage, and Expo's dev push service. That's enough to demo the whole app and test on your own
phone via Expo Go. Going to a real public launch needs a handful of things only you can provide —
each one is a config change, not a code change (see the pluggable-provider tables in
`backend/README.md`).

## 1. Hosting (backend + admin portal + database)

Nothing is deployed anywhere yet — everything runs on this machine. Pick a host (Render, Railway,
a VPS, etc.), provision a PostgreSQL database there, set `backend/.env`'s variables as environment
variables on that host, and run `npm run prisma:migrate` + `npm run prisma:seed` against it once.
The admin portal (`admin-portal/`) is a static build (`npm run build`) that can be hosted
anywhere that serves static files, pointed at the deployed backend via `VITE_API_BASE_URL`.

## 2. A real SMS provider (for OTP)

Right now OTPs are logged to the backend's console and echoed in the API response — fine for
testing, useless for real citizens. Sign up for an SMS provider (Twilio, MSG91, etc.), then:
- Add a class implementing `SmsProvider` in `backend/src/modules/auth/sms/` (mirror
  `console-sms.provider.ts`)
- Wire it into `backend/src/modules/auth/sms/index.ts`'s `createSmsProvider()` switch
- Set `SMS_PROVIDER=<your provider>` and the provider's credentials in `backend/.env`

## 3. Cloud file storage (for production)

Complaint/gallery photos currently save to `backend/uploads/` on local disk — fine for a single
server, but won't survive a redeploy or scale past one instance. When you're ready:
- Create an S3 bucket or Cloudinary account
- Add a class implementing `StorageProvider` in `backend/src/storage/` (mirror
  `local-disk.provider.ts`)
- Set `STORAGE_PROVIDER=s3` (or `cloudinary`) and credentials in `backend/.env`

## 4. Production push notifications (Firebase)

Push already works today via Expo's push service — no Firebase needed for Expo Go / dev testing.
Firebase only becomes necessary for a **production EAS build** (an installable Android APK/AAB,
not Expo Go), because Android routes push delivery through FCM under the hood even for Expo's
push service. When you get there:
- Create a Firebase project, add an Android app to it, download `google-services.json`
- Follow Expo's guide to wire it into `mobile-app/app.json` / EAS build config

## 5. Google Play publishing

- Create a Google Play Developer account (one-time $25 fee)
- `eas build --profile production --platform android` (see `mobile-app/eas.json`) to produce a
  signed AAB
- `eas submit` or upload manually through the Play Console

## 6. Domain, SSL, Google Maps API key

- A custom domain + SSL is whatever your hosting provider offers (usually automatic on Render/Railway,
  or via a reverse proxy like Caddy/Nginx on a VPS)
- No Google Maps API key is needed as built — the "Contact MLA" screen links out to
  `maps.google.com` directly. Only add a Maps API key if you later want an embedded native map view.

## Not in scope at all

iOS builds (this was built Android-first per the original requirements) and any payment/billing
system (none was requested).
