# Changelog

All notable changes to the ChatCo Commuter Mobile project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-09-26

### Added
* **Pre-Deployment Hardening & Security Compliance**:
  * Authored `SECURITY.md` and `.well-known/security.txt` for vulnerability disclosure and on-call escalation.
  * Created `PRIVACY_POLICY.md` compliant with Philippine Data Privacy Act of 2012 (RA 10173).
  * Added direct "Privacy Policy & Data Rights" access card in `ProfileScreen.tsx`.
  * Added `docs/DATA_SAFETY.md` for Google Play Store Data Safety mapping.
  * Added `docs/THREAT_MODEL.md` documenting assets, entry points, trust boundaries, STRIDE analysis, and commuter authentication risk assessment.
  * Added `docs/INCIDENT_RUNBOOK.md` detailing 72-hour National Privacy Commission (NPC) breach response, rapid key revocation, and emergency rollback.
  * Added `docs/DEPLOYMENT.md` detailing staging smoke testing procedures and EAS build commands.
  * Added `docs/DATA_RETENTION.md` outlining data disposal schedules.
* **Automated Testing Suite**:
  * Configured Jest with `ts-jest` for automated unit testing (`npm test`).
  * Implemented unit tests for commuter route polyline coordinates, Bulacan boundaries, and Haversine distance calculations (`src/features/dashboard/__tests__/route-data.test.ts`).
  * Implemented unit tests for brand color tokens and accessibility styling (`src/core/theme/__tests__/colors.test.ts`).
  * Added GitHub Actions CI workflow (`.github/workflows/ci.yml`) to enforce automated typecheck and unit testing on every push and PR.
* **4-Step Web-Parity Registration Wizard**:
  * Step 1: Personal Information with Philippine statutory fare discount notes (20% off for Students, Seniors, PWDs).
  * Step 2: Contact Info & Dynamic ID Upload with camera and image picker.
  * Step 3: Email OTP Verification with 60-second cooldown timer.
  * Step 4: Account Credentials with live 4-rule password validation checklist.
  * Pending Admin Approval review confirmation screen.
* **Animated Splash Screen & Icon-Art Onboarding**:
  * Added suspension hover jeepney animation with concentric radar wave rings and live transit blip.
  * Minimalist icon-and-art onboarding walkthrough with centered Next button and bottom Previous navigation.
  * Added "Replay App Onboarding" helper in Login screen.

### Changed
* Bumped version to `1.0.1` and `versionCode` to `2` in `app.json` and `package.json`.
* Separated build profiles in `eas.json` across `development`, `preview` (APK), and `production` (AAB).
* Enhanced offline resilience for Profile, Rewards loyalty punch card, and Feedback tabs.

### Fixed
* Removed all committed and hardcoded API keys from `CommuterLiveMap.native.tsx`, `CommuterLiveMap.web.tsx`, `app.json`, `eas.json`, and `.env.example`.
* Resolved high-severity transitive dependency advisories (`image-size`, `js-yaml`, and `@xmldom/xmldom`) via `npm audit fix` and package dependency overrides.
* Added `THIRD_PARTY_LICENSES.md` auditing all 583 dependencies for open source license compliance.

---

## [1.0.0] - 2026-09-24

### Added
* Initial release of the ChatCo Commuter Mobile Application with Expo SDK 57 and React Native 0.86.
* Live Leaflet/CartoDB transit map tracking public utility jeepneys along McArthur Highway.
* Cashless QR fare payment with GCash checkout redirection.
* SOS emergency contact modal and ride share tracking links.
