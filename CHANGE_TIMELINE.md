# ChatCo Commuter Mobile change timeline

## Existing dated history

The repository retains its original Git history. Recent existing entries include:

| Date | Commit | Change |
| --- | --- | --- |
| 2026-09-26 | f9f5aba | Release hardening, tests and documentation. |
| 2026-09-26 | 980abfa | Fix Android registration multipart handling and dependency lock. |
| 2026-09-26 | f17883e | Add EAS dependency compatibility. |
| 2026-09-26 | bd3a218 | Normalize vehicle coordinates and hail request parameters. |
| 2026-09-26 | 137b5c9 | Correct SOS coordinates and registration form data. |

## 2026-10-16 — publish accumulated local changes

Pending work is published in separate commits for:

1. Mobile API/session handling, shared trip/reward data and discount/renewal services.
2. Bundled mascot artwork, responsive mascot components and error states.
3. Login, registration, password recovery, welcome and walkthrough screens.
4. Dashboard, fare tools, discounts/renewals, receipts, rewards, feedback, SOS and profile uploads.
5. App navigation, Expo release metadata, source-only publication rules and this timeline.

The original implementation dates of uncommitted changes are not reliably known.
These are publication entries, not backdated claims of when each feature was implemented.
Original commits and their existing dates remain intact.

## Publication checks and limitations

- TypeScript validation passed.
- Jest: 35 suites, 261 tests passed.
- Existing local changes are being published, not certified as production-ready.
- No deployment, backend changes, new APK or physical-device validation is included.
- The backend must expose compatible `/api/v1/mobile/...` routes. Profile uploads,
  renewals and discount applications also require their corresponding backend support.
- Local environment files, signing keys, editor settings and generated native/build files
  are not published. Expo prebuild regenerates native projects from app configuration.
- Mascot source references and generated variants are retained without deleting local work.

Use `git log --date=iso --format="%h %ad %s"` for the exact retained commit chronology.
