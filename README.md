# ChatCo Commuter Mobile

The standalone React Native / Expo mobile application for **ChatCo Commuters**, built with 1:1 functional and visual parity with the official ChatCo Web Commuter Portal.

---

## Features

- **Dashboard & Transit HUD:** Active trip monitor, live route status, GPS corridor positioning, and quick SOS / Share Ride actions.
- **Paper Cash Receipt Scanner:** Claim paper cash receipts via camera scan or manual 6-character token entry to earn free ride points.
- **Rewards & Loyalty Engine:**
  - Ride progress ring and "X Rides to Free Ride" status tracker.
  - 4-step "How free rides work" interactive explainer.
  - Active and archived voucher wallet with one-tap voucher activation codes for conductors.
  - Latest system updates, promos, safety notices, and maintenance advisories with category badges and unread tracking.
- **Fare QR Scanner:** QR ticket scanner with fare breakdowns, discount application, voucher redemption prompts, and GCash handoff.
- **Dual-Crew Feedback:** End-to-end trip feedback system for both Driver and Conductor with dynamic rating tags and confidential reviews.
- **Lost & Found Portal:** Search, filter, report, watch, and submit claims for lost belongings across transit units.
- **Live Ride Sharing:** Real-time GPS location sharing link with automated 30-minute expiration countdown timer.
- **Emergency SOS:** 6-stage emergency broadcast system with live responder polling and 911 / 160 quick hotlines.
- **Account & Concession Management:** Profile management, verified concession badges, contact updates, and 2-step password change flow.

---

## Tech Stack

- **Framework:** React Native (`0.86.2`), Expo (`~57.0.15`), React (`19.2.3`)
- **Language:** TypeScript (`~6.0.3`)
- **Styling:** Custom StyleSheet matching web dark theme (`#050F1A` / `#071A2E`)
- **Maps:** Leaflet via WebView / React Native Web iframe renderer
- **Hardware Integration:** Expo Location, Haptics, Clipboard, KeepAwake

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running or accessible at `https://api.chatco.online` (or local backend)

### Installation

```bash
# Clone the repository
git clone https://github.com/lilkasalananshortie/chatco-commuter-mobile.git

# Navigate into project directory
cd chatco-commuter-mobile

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_API_URL=https://api.chatco.online
NEXT_PUBLIC_CARTO_API_KEY=cb1_2dut_1_0bf5bd46e8782ff0b7ba6f38
```

### Running the App

```bash
# Start on designated commuter port 8082 (clears bundler cache)
npm start

# Run on Web (port 8082)
npm run web

# Type check
npm run typecheck
```

> **Note on Ports:** By design, the Commuter Mobile App runs on **Port 8082**, while the Conductor Mobile App runs on **Port 8081** to ensure smooth simultaneous local testing.
