# Threat Model — ChatCo Commuter Mobile

**App**: `chatco-commuter-mobile`  
**System Architecture**: React Native / Expo Mobile Client communicating with Laravel REST API (`https://api.chatco.online`) via LiteSpeed Reverse Proxy.  
**Review Standard**: OWASP Top 10 (Web/API) & OWASP Mobile Top 10 (MASVS).  

---

## 1. Critical Assets Inventory

What an attacker or malicious actor might target:
1. **User Authentication Tokens**: Bearer JWT tokens authorizing commuter API actions (`chatco_commuter_session`).
2. **Passenger Geolocation & Travel Trajectory**: Real-time pickup coordinates, boarding history, and regular transit habits.
3. **Personally Identifiable Information (PII)**: Full names, email addresses, phone numbers, and uploaded Student/Senior/PWD discount ID cards.
4. **Financial Transaction Tokens**: QR fare reference codes and GCash checkout links.
5. **Transport Fleet Telemetry**: Live vehicle locations, conductor shifts, and passenger capacity numbers.
6. **Application Reputation & Availability**: Continuous service availability for commuters during peak transit hours.

---

## 2. Entry Points Inventory

Every pathway where external input or data crosses into the mobile application:
1. **User Input Forms**:
   * Registration form (name, email, phone, password, discount role).
   * Login form (email/phone and password).
   * Feedback & lost item reporting text inputs.
2. **Hardware Sensors & Devices**:
   * Camera video stream processed by `expo-camera` for QR token decoding.
   * GPS hardware receiver processed by `expo-location`.
   * Photo gallery file picker for ID card verification uploads.
3. **Network & External Communications**:
   * REST JSON responses received from `https://api.chatco.online/api/v1/*`.
   * Map raster tile requests from `https://*.basemaps.cartocdn.com` and `https://*.tile.openstreetmap.org`.
   * Deep links and URL scheme intents matching `chatco-commuter://`.
   * External browser callbacks from GCash payment checkout sessions.

---

## 3. Trust Boundaries

1. **Client Device vs Backend Server**: The mobile application is an untrusted client running on user hardware. The backend server (`api.chatco.online`) never trusts client claims without server-side Bearer token validation and database role checks.
2. **Application Process vs Device Storage**: Secure tokens are isolated within hardware Keystore/Keychain via `expo-secure-store`, protected from ordinary filesystem access and other third-party apps.
3. **Application Process vs External Payment Gateway**: All monetary GCash transactions are delegated to external, licensed payment providers via external browser URLs. No raw financial account numbers or credit cards are accepted or processed inside the mobile app.

---

## 4. STRIDE Threat Analysis & Mitigations

| Category | Threat Scenario | Impact | Mitigation Implemented |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker spoofs commuter identity with stolen credentials. | Unauthorized hailing, access to ride history. | Strong password rules, email OTP verification, server-side Sanctum token revocation on logout. |
| **Tampering** | Man-in-the-Middle (MitM) modifies fare amount or coordinates in transit. | Incorrect fare collection, diverted vehicle. | Enforced TLS 1.2+ (`https://` everywhere); `usesCleartextTraffic` disabled; server validates fare calculations from matrix. |
| **Repudiation** | Commuter claims they never hailed or rode the vehicle. | Disputed fare payments. | Server logs transaction IDs, QR token timestamps, and conductor dispatch confirmations. |
| **Information Disclosure** | Sensitive auth tokens extracted from device backup or memory. | Account takeover. | Hardware-backed Keystore encryption (`expo-secure-store`); zero secrets or tokens logged in `console.log`. |
| **Denial of Service** | Malicious script spams OTP or login requests from mobile client. | Email server exhaustion, account lockout. | 60-second client-side OTP cooldown timer; server-side `ThrottleRequests` rate limiting. |
| **Elevation of Privilege** | Commuter attempts to access Conductor or Admin dispatch APIs. | Unauthorized fleet control. | Role-Based Access Control (RBAC) enforced server-side on every request; commuter app has zero conductor routes. |

---

## 5. Authentication Architecture & MFA Risk Acceptance

* **Consumer Commuter Tier**: Standard commuter accounts use email/phone + password authentication accompanied by email OTP verification during registration and password resets.
* **MFA Justification**: Multi-factor authentication (MFA / Authenticator App / Hardware Token) is implemented and mandated for high-privilege Conductor and Admin dispatch roles. Commuter accounts carry low financial liability because payments are routed through GCash external 2FA. The risk of omitting TOTP for commuter accounts is formally accepted to optimize accessibility for mass-transit commuters in the Philippines.
