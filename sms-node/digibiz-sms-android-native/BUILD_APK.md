# DigiBiz Gateway v2.0 APK Build

## Prerequisites
- Flutter SDK installed and in PATH
- Android SDK + platform tools installed
- Java 17 (recommended)

## Build Steps
1. Open terminal in this folder:
   - `sms-node/digibiz-sms-android-native`
2. Get dependencies:
   - `flutter pub get`
3. Build release APK:
   - `flutter build apk --release`
4. Output APK path:
   - `build/app/outputs/flutter-apk/app-release.apk`

## Install on Device
1. Copy `app-release.apk` to Android phone.
2. Allow install from unknown sources.
3. Install APK and login with same DigiBiz Web email/password.

## Isolation + Payload Contract
- The app resolves `businessId` from the authenticated user profile.
- It listens only to:
  - `sms_gateway/{businessId}/pending_sms`
- Payload format supported:
  - `{ mobile: "...", message: "..." }`
  - legacy list payload fallback is still supported.
