# Security Incident Response & Emergency Runbook

**Project**: ChatCo Commuter Mobile  
**Author**: ChatCo Operations & Security Team  
**Last Updated**: September 26, 2026  

---

## 1. Incident Lifecycle Overview

ChatCo adheres to a 5-stage incident management process:

```
[ 1. DETECT ] ➔ [ 2. CONTAIN ] ➔ [ 3. ERADICATE ] ➔ [ 4. RECOVER ] ➔ [ 5. POST-MORTEM ]
```

---

## 2. Emergency Key Revocation & Credential Rotation Protocol

If an API key, database password, or EAS signing token is compromised:

### Step 1: Revoke Compromised Key Immediately
* **CARTO API Key**:
  1. Log in to CARTO Developer Dashboard (`https://app.carto.com/`).
  2. Navigate to **API Keys** → Select compromised key → Click **Revoke / Delete**.
  3. Generate a new restricted API key scoped strictly to Tile Services.
* **EAS Cloud Secrets**:
  ```bash
  # Delete the compromised secret
  npx eas secret:delete --name EXPO_PUBLIC_CARTO_API_KEY
  # Create the newly rotated secret
  npx eas secret:create --name EXPO_PUBLIC_CARTO_API_KEY --value <NEW_KEY> --type string --scope project
  ```
* **Server-Side Laravel App Key / Database Credentials**:
  1. Access backend hosting environment (cPanel / LiteSpeed server).
  2. Update `.env` on server and run `php artisan config:cache`.
  3. Invalidate active user tokens: `php artisan sanctum:prune-expired`.

---

## 3. Emergency Binary Rollback Procedure (< 5 Minutes)

If a released APK contains a critical regression, crash-loop, or security vulnerability:

1. **Identify Last Known Good Commit**:
   ```bash
   git tag -l
   # Locate previous stable release tag, e.g. v1.0.0
   git checkout tags/v1.0.0
   ```
2. **Trigger Immediate Emergency Build**:
   ```bash
   npx eas build -p android --profile preview --non-interactive
   ```
3. **Notify Users & Force Update**:
   * If `expo-updates` is enabled:
     ```bash
     npx eas update --branch production --message "Emergency rollback to stable build"
     ```
   * Set minimum supported version in server config (`MIN_CLIENT_VERSION = 1.0.0`) to block compromised client requests.

---

## 4. Data Breach Response & National Privacy Commission (NPC) 72-Hour Rule

Under **Republic Act No. 10173 (Philippine Data Privacy Act)** and **NPC Circular 16-03**, any security incident involving unauthorized acquisition of sensitive personal information must follow this statutory protocol:

### Within Hour 0 – 24 (Containment & Forensic Assessment)
1. **Isolate Affected Systems**: Cut network access to compromised services.
2. **Determine Scope**: Assess whether PII (names, contact numbers, valid government/student IDs) was accessed or exfiltrated.
3. **Notify Data Protection Officer (DPO)**: Contact `dpo@chatco.online`.

### Within Hour 24 – 72 (Mandatory Regulatory & Subject Notification)
1. **Report to the National Privacy Commission (NPC)**:
   * Formal notification must be submitted via the NPC Data Breach Notification Management System (`https://dbms.privacy.gov.ph`) within **72 hours** of breach discovery.
   * Include: Description of nature of breach, estimated number of affected data subjects, possible consequences, and measures taken/proposed.
2. **Notify Affected Commuters**:
   * Send notification via in-app push notification and registered email informing affected commuters of the breach, compromised data fields, and immediate protective measures (such as password reset).

---

## 5. Security Contacts

* **Incident Commander**: `security@chatco.online`
* **Data Protection Officer**: `dpo@chatco.online`
* **Technical Lead**: `support@chatco.online`
