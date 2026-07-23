# Mobile App — Atul Bhansali Citizen Connect

React Native (Expo SDK 57, managed workflow) citizen app.

## Run it on your phone (Expo Go — fastest path, no build step)

1. Install **Expo Go** from the Play Store (Android) or App Store (iOS) on your phone.
2. Make sure your phone and this computer are on the **same Wi-Fi network**.
3. `cp .env.example .env` and, if testing on a physical device, set
   `EXPO_PUBLIC_API_BASE_URL` to this computer's LAN IP (not `localhost` — that resolves to the
   phone itself). Also set the backend's `PUBLIC_URL` the same way so uploaded photos load
   correctly on-device.
4. `npm run start` (or `npx expo start`), then scan the QR code with Expo Go (Android: Expo Go's
   built-in scanner; iOS: the Camera app).

The backend must be running and reachable from your phone (`../backend`, see its README).

## Local setup (simulator/emulator or web preview)

```bash
cp .env.example .env
npm run start      # then press "a" for Android emulator, "i" for iOS simulator, or "w" for web
```

## App structure

- `src/navigation/` — Auth stack (phone entry → OTP verify) and the post-login tab bar (Home,
  Announcements, Development Works, More), each tab wrapping its own stack.
- `src/screens/` — one folder per feature area, mirroring the navigation structure.
- `src/lib/api-client.ts` — axios instance with token-refresh interceptor (same pattern as the
  admin portal's).
- `src/lib/secure-store.ts` / `src/store/authStore.ts` — tokens persist in `expo-secure-store`
  (encrypted keychain/keystore), not `AsyncStorage`.
- `src/lib/offline-queue.ts` + `src/hooks/useOfflineSync.ts` — complaints submitted while offline
  are queued in `AsyncStorage` and flushed automatically the next time connectivity returns.
- `src/lib/notifications.ts` — requests push permission and registers the device's Expo push
  token with the backend on login. Works out of the box in Expo Go / dev builds with zero Firebase
  setup; a real Firebase project is only needed for a production EAS build (see root README).

## AGENTS.md / CLAUDE.md

Expo's own scaffold drops an `AGENTS.md` (imported by `CLAUDE.md`) pointing at the versioned SDK
docs. Leave those files as-is — they're Expo's, not this project's.

## Monorepo note

`metro.config.js` is configured for npm workspaces (`watchFolders` + `disableHierarchicalLookup`)
so it can resolve `@abc/shared`. If you ever see "Unable to resolve module @abc/shared", clear the
Metro cache first (`npx expo start -c`) before assuming something is actually broken.
