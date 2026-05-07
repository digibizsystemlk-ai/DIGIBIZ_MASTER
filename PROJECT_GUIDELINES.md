# DIGIBIZ Project Guidelines for AI Assistants

This document contains critical rules and patterns that MUST be followed when modifying the DIGIBIZ codebase. These rules are designed to prevent regressions and maintain multi-tenant isolation.

## 1. Auth & Registration Flow Protection
- **Modular Logic**: All auth routing and business context resolution logic MUST be kept in `public/core/auth-utils.js`. **DO NOT** duplicate `routeToUniversalDashboard` in individual HTML files.
- **Registration Logic**: Business type population is in `public/core/registration-utils.js`. 
- **Smart Check**: Mandatory logic for business type auto-detection.

## 2. Automated Regression Suite
- **E2E Tests**: A full suite of tests exists in `tests/e2e/`. These MUST be run after any change to core modules:
  - `auth.spec.js`: Login UI and error handling.
  - `registration.spec.js`: Registration flow and Smart Check.
  - `sidebar.spec.js`: Navigation and dynamic menus.
- **Command**: Run `npx playwright test` to execute all tests.

## 3. Multi-Tenant Isolation
- **Strict Isolation**: NEVER modify logic that impacts existing "LIVE" tenants (e.g., KUBUKA, SPRANZA, MW Trading) without wrapping changes in a `businessId` gate.
- **Global Variables**: Avoid polluting global scope. Use `window.AuthUI`, `window.RegistrationUI`, etc.

## 4. Localization (Sinhala)
- **User Communication**: Always communicate with the primary user in Sinhala.
- **UI Text**: Maintain and respect Sinhala translations in the UI.

## 5. Deployment Protocol
- **Verification**: Run the full E2E suite before any hosting deployment (`firebase deploy --only hosting`).
- **Git State**: Ensure all stable states are tagged (e.g., `v1.x.x-stable`).

---
*Created on 2026-05-07*
