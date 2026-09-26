# Google Play Data Safety & App Privacy Disclosure

**App Name**: ChatCo Commuter  
**Package Name**: `com.chatco.commuter`  
**Target Platform**: Android (Google Play Store) & iOS (App Store)  

This document provides the exact responses required for the Google Play Console Data Safety Form and Apple App Privacy Nutrition Labels.

---

## 1. Overview of Data Practices

* **Data Collected**: Yes (Location, Personal info, Photos, App info & performance).
* **Data Shared**: Yes (Only with payment processors and transport cooperatives for service fulfillment).
* **Data Encrypted in Transit**: Yes (All endpoints enforce TLS 1.2+ HTTPS).
* **Account Deletion Supported**: Yes (Users can request complete data erasure).

---

## 2. Detailed Data Type Mapping

| Data Category | Specific Data Type | Collected? | Shared? | Purpose | Ephemeral or Stored? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Location** | Approximate location | Yes | No | App functionality (Map display) | Stored |
| **Location** | Precise location | Yes | No | App functionality (Jeepney hailing & nearby blips) | Ephemeral / Ride duration |
| **Personal Info** | Name | Yes | No | Account management, profile display | Stored |
| **Personal Info** | Email address | Yes | No | Account auth, OTP verification, password reset | Stored |
| **Personal Info** | Phone number | Yes | No | Account verification, hailing contact | Stored |
| **Personal Info** | User IDs | Yes | No | App functionality, session token authentication | Stored |
| **Photos & Videos** | Photos (ID Card) | Yes | No | Verification of statutory 20% fare discount | Stored until verified |
| **Financial Info** | Payment info | No | Yes | External GCash checkout (ChatCo does not store card data) | Handled by Payment Gateway |
| **App Info & Performance** | Diagnostics & crash logs | Yes | No | App reliability, performance monitoring | Ephemeral |

---

## 3. Security Practices

* **Data Encryption in Transit**: All data transmitted between the app and `https://api.chatco.online` is protected using industry-standard HTTPS/TLS.
* **Secure Storage on Device**: Session tokens are encrypted in hardware storage (`expo-secure-store` utilizing Android Keystore / iOS Keychain).
* **Data Erasure**: Commuters may request complete deletion of their account, ride history, and uploaded ID photos.
