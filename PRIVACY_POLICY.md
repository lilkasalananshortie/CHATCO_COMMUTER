# Privacy Policy for ChatCo Commuter Mobile

**Effective Date**: September 26, 2026  
**Last Updated**: September 26, 2026  

ChatCo ("we", "us", or "our") operates the **ChatCo Commuter Mobile Application** serving public utility jeepney commuters along the Calumpit–Meycauayan transport corridor in Bulacan, Philippines.

We are committed to protecting your personal data in full compliance with the **Data Privacy Act of 2012 (Republic Act No. 10173)** of the Philippines, its Implementing Rules and Regulations (IRR), and issuances of the **National Privacy Commission (NPC)**.

---

## 1. Information We Collect

1. **Account & Identification Information**:
   * Full Name, Email Address, and Mobile Phone Number.
   * Authentication credentials (hashed server-side; device authentication tokens encrypted locally via Keystore).
   * For statutory fare discounts (Student, Senior Citizen, PWD): Image of valid government/school identification card to comply with Philippine laws (RA 11314, RA 9994, RA 7277).
2. **Location & Transit Data**:
   * Approximate and precise geolocation (only collected while using the app) to display approaching vehicles, calculate estimated transit arrival times (ETA), and allow you to signal "Pick Me Up".
   * Origin and destination transit stops, vehicle boarding timestamps, and trip route history.
3. **Camera & Scanner Data**:
   * Camera feed used solely during active scanning of conductor fare QR codes or paper ride receipts. Raw camera streams are not recorded or uploaded to our servers; only scanned alphanumeric QR tokens are transmitted.
4. **App Diagnostics & Device Data**:
   * Device model, operating system version, app version, network connectivity status, and crash diagnostics to ensure service reliability.

---

## 2. Legal Basis and Purpose of Processing

Your personal data is processed based on:
1. **Contractual Necessity**: To provide real-time jeepney hailing, cashless GCash fare payment routing, and passenger boarding confirmation.
2. **Legal Obligation**: To verify eligibility for mandated 20% fare discounts granted to students, seniors, and persons with disabilities.
3. **Legitimate Interest**: To improve cooperative vehicle dispatch schedules, reduce road congestion, and locate reported lost items.

---

## 3. Data Protection and Storage

* **Encryption in Transit**: All network requests to `https://api.chatco.online` use Transport Layer Security (TLS 1.2/1.3). Plaintext HTTP is strictly blocked.
* **Encryption at Rest**: Sensitive authentication tokens are stored securely in your device’s hardware-backed Keystore / Keychain using `expo-secure-store`.
* **Zero Sale of Personal Data**: We do not sell, rent, or trade commuter personal data to any advertisers or third-party data brokers.

---

## 4. Third-Party Disclosures

We share information only with trusted transport and payment partners strictly necessary for operations:
* **Transport Cooperatives & Conductors**: Hailing location and discount eligibility status for passenger onboarding.
* **Payment Gateways (GCash / PayMongo)**: Redirected payment processing via secure external checkout sessions.
* **Map Tile Services (CartoDB / OpenStreetMap)**: Anonymous coordinate tile requests.

---

## 5. Commuter Rights Under the Data Privacy Act (RA 10173)

As a data subject, you have the right to:
1. **Right to be Informed**: Understand how your data is collected and processed.
2. **Right to Access**: Request a copy of your personal data held in our systems.
3. **Right to Rectification**: Correct any inaccurate or incomplete profile data.
4. **Right to Erasure / Blocking**: Request deletion of your account and associated ride records by emailing `privacy@chatco.online` or selecting "Delete Account" in your Profile settings.
5. **Right to Damages & Lodge a Complaint**: File a complaint with the National Privacy Commission (`https://privacy.gov.ph`) if you believe your privacy rights have been violated.

---

## 6. Contact Our Data Protection Officer (DPO)

For inquiries, requests to exercise your privacy rights, or feedback:
* **Data Protection Officer**: ChatCo Transport Cooperative Consortium
* **Email**: `dpo@chatco.online` / `privacy@chatco.online`
* **Address**: Calumpit Municipal Transport Terminal, Bulacan, Philippines
