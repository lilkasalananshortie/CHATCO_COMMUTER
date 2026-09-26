# Data Retention & Disposal Policy

**Project**: ChatCo Commuter Mobile  
**Standard**: Philippine RA 10173 (Data Privacy Act of 2012)  

---

## 1. Retention Schedule

| Data Category | Data Elements | Retention Period | Disposal Method |
| :--- | :--- | :--- | :--- |
| **Active Account Data** | Name, email, phone number, role | Duration of active commuter account + 1 year of inactivity | Secure electronic purge from database |
| **Discount Verification Records** | Student / Senior / PWD ID photos | Kept until verification status confirmed (max 90 days) | File permanently deleted from storage bucket |
| **Ride & Hailing Logs** | Coordinates, pickup/dropoff points, timestamps | 6 months for dispute resolution and transit traffic analytics | Automated aggregation / anonymization |
| **Financial Transaction Records** | QR reference tokens, payment timestamps | 5 years to comply with Philippine tax & audit regulations (BIR / LTFRB) | Encrypted archive |
| **Crash & Diagnostic Logs** | Error stack traces, device model, app version | 30 days | Automatic log rotation and purging |

---

## 2. User-Requested Data Erasure

When a commuter requests account deletion (via in-app Profile option or email to `privacy@chatco.online`):
1. **Immediate Action**: The commuter account is disabled, active sessions are invalidated, and local device tokens are destroyed.
2. **Within 30 Days**: All personal identifiers (name, phone, email, uploaded photos) are scrubbed from production databases and storage buckets.
