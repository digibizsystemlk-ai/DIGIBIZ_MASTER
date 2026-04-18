# DigiBiz SMS Node (Capacitor)

Android gateway for DigiBiz: listens to Firestore **`pending_sms`**, sends SMS via **`@byteowls/capacitor-sms`** (`SmsManager`), then sets **`status: "sent"`** and **`sentAt`**.

## Layout

- **`www/`** — source UI and logic (`index.html`, `js/app.js`, `css/style.css`). Vite `root` is `www/`.
- **`dist/`** — production bundle (`npm run build`). Capacitor **`webDir`** is **`dist`**.

Firebase config is aligned with **`public/core/firebase-init.js`** (project `digibiz-sys`).

## Run & ship

```bash
cd sms-node/digibiz-sms-node
npm install
npm run build
npx cap sync android
```

On device: open the app, sign in with **DigiBiz email and password** only. The app reads `users/{uid}` and `businesses` to resolve **businessId**, stores it in **localStorage**, and shows **DigiBiz SMS Gateway — Active & Listening** (no manual business id field).

Deploy Firestore **rules** and **indexes** (including `pending_sms` composite with `createdAt`) from the main repo before relying on the listener.

## Notes

- **`@byteowls/capacitor-sms`** typically opens the system SMS UI on Android; `SEND_SMS` is declared in `AndroidManifest.xml`. After the user completes send, the plugin promise resolves and the app marks the doc **sent**.
- On **web** preview, sends are skipped (plugin unavailable); use a real Android build for end-to-end tests.
