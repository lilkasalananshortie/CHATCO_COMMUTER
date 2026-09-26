# Incident Post-Mortem Template

**Incident Title**: [Short Description of Incident]  
**Date of Incident**: YYYY-MM-DD  
**Incident Lead**: [Name / Email]  
**Severity Level**: [P1 - Critical / P2 - Major / P3 - Moderate]  

---

## 1. Summary
*Brief 2-3 sentence overview of what happened, customer impact, and how it was resolved.*

---

## 2. Impact
* **Users Affected**: (e.g. 150 commuters unable to scan QR codes)
* **Duration of Outage**: (e.g. 25 minutes)
* **Data Breach?**: [Yes / No] (If yes, confirm NPC notification filed within 72 hours)

---

## 3. Timeline (All times in PHT / UTC+8)
* **HH:MM** - Incident detected via [monitoring alert / user report].
* **HH:MM** - Incident response team mobilized.
* **HH:MM** - Root cause identified: [describe].
* **HH:MM** - Mitigation deployed / Rollback initiated.
* **HH:MM** - Full service restored and verified.

---

## 4. Root Cause
*Detailed technical description of why the incident occurred (Five Whys analysis).*

---

## 5. Corrective & Preventative Actions
| Action Item | Type | Owner | Target Date |
| :--- | :--- | :--- | :--- |
| Add integration test for failing scenario | Preventative | [Name] | YYYY-MM-DD |
| Update deployment runbook | Process | [Name] | YYYY-MM-DD |
| Rotate affected credentials | Remediation | [Name] | YYYY-MM-DD |
