# ChatCo Commuter Mobile Deployment Guide

**Target Application**: `chatco-commuter-mobile`  
**Framework**: React Native 0.86 with Expo SDK 57  
**Build System**: Expo Application Services (EAS Build)  

---

## 1. Pre-Deployment Verification

Before triggering any release build, execute the local quality gates:

```bash
# 1. Verify TypeScript types
npm run typecheck

# 2. Run automated tests
npm test

# 3. Ensure git working tree is clean
git status
```

---

## 2. Release Build Commands

### A. Preview / Sideloadable APK (For Device Testing & Cooperative Pilots)
```bash
npx eas build -p android --profile preview
```
* **Output**: Standalone `.apk` file.
* **Distribution**: Direct sideload, download link, or QR code installation.

### B. Production AAB (For Google Play Store Release)
```bash
npx eas build -p android --profile production
```
* **Output**: Optimized `.aab` (Android App Bundle).
* **Distribution**: Uploaded to Google Play Console Internal / Production track.

---

## 3. Staging Smoke Test Checklist

Execute these 5 smoke tests on the generated build before deploying to commuters:

1. **Authentication Flow**:
   * Complete registration walkthrough with valid Bulacan phone and email.
   * Verify email OTP arrives and 60-second cooldown timer operates.
2. **Live Map & GPS Hailing**:
   * Grant location permission; confirm commuter coordinate pin centers along Calumpit–Meycauayan line.
   * Press "Pick Me Up" and confirm hail broadcast initiates without network crash.
3. **QR Scanner Flow**:
   * Grant camera permission; point at conductor sample QR code.
   * Verify fare modal pops up with correct regular and discounted fare options.
4. **Session Resilience**:
   * Toggle Airplane mode on and off; confirm app gracefully shows cached profile and loyalty punch cards without blank screens.
5. **Secure Logout**:
   * Tap "Log Out" in Profile; confirm local session token is removed and app returns cleanly to Onboarding / Login screen.

---

## 4. Rapid Rollback Procedure

In the event of an urgent defect in production:
1. Revert to the previous git tag:
   ```bash
   git checkout tags/v1.0.0
   ```
2. Build and distribute the rollback APK:
   ```bash
   npx eas build -p android --profile preview
   ```
3. Announce rollback to commuters and cooperators via terminal dispatch broadcast.
