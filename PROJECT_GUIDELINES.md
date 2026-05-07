# DIGIBIZ Project Guidelines for AI Assistants

This document contains critical rules and patterns that MUST be followed when modifying the DIGIBIZ codebase. These rules are designed to prevent regressions and maintain multi-tenant isolation.

## 1. Registration Flow Protection
- **Registration Logic**: The business type population logic is modularized in `public/core/registration-utils.js`. **DO NOT** move this logic back into `register.html`.
- **Smart Check**: The "Smart Check" logic (checking `isReady` config + live `businesses` collection) is mandatory. Do not simplify it to show all types without a valid reason.
- **Other Option**: The "Other" option and its associated Sinhala UI elements in `register.html` are essential for lead generation. Do not remove or modify them without explicit user request.

## 2. Multi-Tenant Isolation
- **Strict Isolation**: NEVER modify logic that impacts existing "LIVE" tenants (e.g., KUBUKA, SPRANZA, MW Trading) without wrapping changes in a `businessId` gate.
- **Global Variables**: Avoid polluting the global scope. Use `window.RegistrationUI` or similar namespaces for new utilities.

## 3. Localization (Sinhala)
- **User Communication**: Always communicate with the primary user in Sinhala as requested.
- **UI Text**: Maintain the high-quality Sinhala translations in the UI.

## 4. Testing before Deployment
- **E2E Tests**: Before claiming a task is "finished", run the Playwright tests in `tests/e2e/`. Specifically, run `tests/e2e/registration.spec.js` after any change to the auth flow.
- **Firebase Hosting**: Only deploy to hosting (`firebase deploy --only hosting`) after verifying changes locally or via test scripts.

## 5. Deployment Protocol
- **Change Log**: Every deployment must be preceded by a clear summary of what changed and why.

---
*Created on 2026-05-07*
