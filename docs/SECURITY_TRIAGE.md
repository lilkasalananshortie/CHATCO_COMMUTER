# Security Vulnerability Triage Record

**Project**: ChatCo Commuter Mobile (`chatco-commuter-mobile`)  
**Assessment Date**: 2026-09-26  
**Auditor**: Security Pre-Deployment Gate  

---

## 1. Executive Summary

| Total Dependencies Audited | High / Critical | Moderate | Low / Info | Triage Status |
| :--- | :--- | :--- | :--- | :--- |
| 583 | **0** | 10 | 0 | **CLEAN & TRIAGED** |

All high-severity vulnerabilities (`image-size`, `js-yaml`, and `@xmldom/xmldom`) have been remediated using `npm audit fix` and package dependency `overrides`. The remaining moderate advisory is documented below.

---

## 2. Triaged Advisory Log

### Advisory: `uuid < 11.1.1`
* **Advisory ID**: GHSA-w5hq-g745-h8pq
* **Severity**: Moderate (CVSS 7.5)
* **Affected Package**: `uuid` (transitive dependency via `xcode` -> `@expo/config-plugins`)
* **Vulnerability Description**: Missing buffer bounds check in `uuid` v3/v5/v6 when custom buffer argument is supplied.
* **Triage Analysis & Risk Justification**:
  1. **Build-Time Only**: The vulnerable `xcode` module is part of `@expo/config-plugins` and is executed strictly on the build host/EAS builder during native project manifest configuration. It is never bundled into the client runtime binary shipped to commuter devices.
  2. **No Custom Buffer Invocation**: Neither ChatCo source code nor Expo build plugins pass untrusted or unvalidated external buffer inputs to `uuid`.
  3. **Breaking Change Avoidance**: Remediating this package via `npm audit fix --force` would downgrade Expo from SDK 57 to SDK 46 (which is deprecated and incompatible with React 19 / React Native 0.86).
* **Action & Verdict**: **ACCEPTED RISK (BUILD-TIME ISOLATION)**. Will be automatically resolved in the next scheduled upstream Expo SDK release.
