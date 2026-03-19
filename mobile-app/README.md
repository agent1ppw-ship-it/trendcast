# Trendcast Mobile (iPhone/Android)

Expo + TypeScript mobile app for the core Trendcast workflow.

## Current v1 scope
- Real mobile auth flow against backend (`/api/mobile/auth/login`)
- Google sign-in support
- Apple sign-in support for iPhone release readiness
- Core screens:
  - Login
  - Dashboard
  - Leads / Pipeline CRM
  - Business Finder
  - Direct Mail
  - Settings
- Native stack + bottom tab navigation
- EAS build profiles for preview and production
- Dynamic Expo config for bundle IDs, build numbers, app scheme, and API base URL
- Generated icon, splash, and iOS store asset files under `assets/`

## Backend mobile endpoints wired
- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/google`
- `POST /api/mobile/auth/apple`
- `GET /api/mobile/me`
- `GET /api/mobile/leads`
- `POST /api/mobile/leads`
- `PATCH /api/mobile/leads/:leadId`
- `POST /api/mobile/business-finder/search`
- `GET /api/mobile/business-finder/search/:jobId`
- `GET /api/mobile/direct-mail`
- `POST /api/mobile/direct-mail/sender-profile`
- `POST /api/mobile/direct-mail/campaigns`
- `POST /api/mobile/direct-mail/campaigns/:campaignId/send`
- `POST /api/mobile/direct-mail/campaigns/:campaignId/cancel`

## Run locally
```bash
cd mobile-app
npm install
npm run start
```

Then press `i` in Expo CLI for iPhone simulator.

## Environment
Copy `.env.example` to `.env` and set:

```bash
EXPO_PUBLIC_API_BASE_URL=https://trendcast.io
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
APP_SCHEME=trendcast
APP_IOS_BUNDLE_IDENTIFIER=io.trendcast.mobile
APP_ANDROID_PACKAGE=io.trendcast.mobile
APP_IOS_BUILD_NUMBER=1
APP_ANDROID_VERSION_CODE=1
EAS_PROJECT_ID=
```

Server-side for Google token audience checks:
- `MOBILE_GOOGLE_CLIENT_IDS` (comma-separated allowed client IDs) or rely on existing `GOOGLE_CLIENT_ID`.

Server-side for Apple token audience checks:
- `MOBILE_APPLE_CLIENT_IDS` (comma-separated allowed client IDs / bundle identifiers)

## Generate release assets
```bash
cd mobile-app
npm run assets:generate
```

## Build for iPhone
```bash
cd mobile-app
npm run build:ios:preview
```

For production:
```bash
cd mobile-app
npm run build:ios:production
```

## Release checklist
1. Set the bundle ID, scheme, build numbers, and EAS project ID in `.env`.
2. Configure Google and Apple OAuth client IDs for the app build target.
3. Run `npm run assets:generate` if you change branding.
4. Run a preview build and verify login, leads, business finder, direct mail, and CRM flow on device.
5. Submit the production build with `npm run submit:ios`.
