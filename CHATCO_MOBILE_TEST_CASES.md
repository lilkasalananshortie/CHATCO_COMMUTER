# CHATCO Mobile System Test Cases: Commuter & Conductor Applications

**Target Platforms:** React Native / Expo (Android & iOS)  
**Applications Covered:**
1. **CHATCO Commuter Mobile App** (`chatco-commuter-mobile`)
2. **CHATCO Conductor Mobile App** (`chatco-mobile`)

**Standard Test Data:**
- **Credentials:**
  - Commuter: `juan.commuter@gmail.com` / `Chatco@123`
  - Conductor: `c.delacruz` / `Chatco@123`
  - Admin: `admin@chatco.ph` / `Chatco@123`
- **Contact Number:** `09171234567`
- **Vehicle Units:** Unit `J-04` (Plate `NDB-5821`), Unit `J-08` (Plate `CAK-9021`)
- **Corridor Line:** Calumpit – Meycauayan Route (McArthur Highway Corridor)
- **Status Key:** `P` = Passed, `F` = Failed, `W` = Warning / Known Observation

---

## Master Test Phase Summary

| Phase | Target Application | Modules Covered | Cases Count | Case IDs |
| :--- | :--- | :--- | :---: | :--- |
| **Phase M1: Commuter Mobile Onboarding & Authentication** | Commuter Mobile | First-Launch Walkthrough, Login, Signup, Platform-Scoped Tokens | 18 | `TC-COMM-AUTH-001` to `018` |
| **Phase M2: Real-Time Radar & Smart Hailing** | Commuter Mobile | CARTO Live Map, Failover, 1km Radius Guard, Hail Request & Timers | 15 | `TC-COMM-HAIL-019` to `033` |
| **Phase M3: Cashless GCash Checkout & Ride History** | Commuter Mobile | Camera QR Scanner, Manual Token, Concession Fare, GCash Checkout, Payment History | 14 | `TC-COMM-PAY-034` to `047` |
| **Phase M4: Paper Receipt Scanner & Rewards Wallet** | Commuter Mobile | Receipt QR Scan, Token Entry, 10-Ride Progress Cycle, Vouchers Wallet, Announcements | 16 | `TC-COMM-REWARD-048` to `063` |
| **Phase M5: Commuter Safety Shield & Emergency Response** | Commuter Mobile | 30-min Ride Share URL, Double-Tap SOS Alert, Hotline Speed Dials | 10 | `TC-COMM-SAFE-064` to `073` |
| **Phase M6: Centralized Lost & Found Recovery** | Commuter Mobile | Belongings Catalog, Watchlist, Proof Submission, Claim History | 14 | `TC-COMM-LOST-074` to `087` |
| **Phase M7: Crew Ride Feedback & Rating** | Commuter Mobile | Unit QR Resolution, Dual 5-Star Ratings, Tag Chips, Comments | 10 | `TC-COMM-FEED-088` to `097` |
| **Phase M8: Commuter Profile & Account Security** | Commuter Mobile | Concession Status, Contact Edit, 2-Step Password Reset, Tour Replay | 12 | `TC-COMM-PROF-098` to `109` |
| **Phase C1: Conductor Login & Shift Initialization** | Conductor Mobile | Mobile Conductor Login, Unit Verification, Driver Pairing, Lockout | 12 | `TC-COND-AUTH-110` to `121` |
| **Phase C2: Operating Device Ownership & Handoff** | Conductor Mobile | Single-Device Ownership, View-Only Mode, Safe Device Handoff | 8 | `TC-COND-DEV-122` to `129` |
| **Phase C3: Live Status, GPS Broadcast & Capacity** | Conductor Mobile | GPS Tracking, Capacity Toggle (Standing/Full), Break Duty Mode | 10 | `TC-COND-STAT-130` to `139` |
| **Phase C4: Offline-First Fare Calculator & Ticketing** | Conductor Mobile | Fare Matrix, Concession Discounts, Group Rides, Offline Cash Queue | 15 | `TC-COND-FARE-140` to `154` |
| **Phase C5: Conductor GCash QR & Voucher Redemption** | Conductor Mobile | Dynamic QR Display, Real-Time Webhook Polling, Voucher Verification | 12 | `TC-COND-PAY-155` to `166` |
| **Phase C6: Real-Time Hail Management & Dispatch** | Conductor Mobile | 1km Hail Audio/Haptic Alert, Accept/Reject Hail, 3-min Expiry | 8 | `TC-COND-HAIL-167` to `174` |
| **Phase C7: Conductor Emergency SOS & Incident Logging** | Conductor Mobile | Incident SOS Alert, Rate Limiting, Live Dispatch Broadcast | 6 | `TC-COND-SAFE-175` to `180` |
| **Phase C8: Remittance, Reconcile & Shift Closeout** | Conductor Mobile | Shift Summary Metrics, Unsynced Cash Guard, Closeout, History | 10 | `TC-COND-REMIT-181` to `190` |
| **Phase X1: Cross-App Interoperability & Concurrency** | Both Mobile Apps | Conductor QR -> Commuter GCash Pay, Hail Sync, Concurrent Sessions | 12 | `TC-INT-191` to `202` |
| **Phase X2: Mobile Hardware, Storage & Reliability** | Both Mobile Apps | Camera Permissions, Background GPS, Airplane Mode Sync, App Kill | 12 | `TC-SYS-203` to `214` |
| **Total Test Cases** | | | **214** | |

---

# SECTION 1: CHATCO COMMUTER MOBILE APPLICATION

## Phase M1: Commuter Mobile Onboarding & Authentication

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COMM-AUTH-001` | First-launch onboarding walkthrough appears | Fresh installation / storage cleared (`@chatco_commuter_onboarding_completed` is null) | 1. Launch the mobile commuter application | The 4-step onboarding guide screen appears immediately before login. Shows Step 1 badge: "REAL-TIME RADAR", CARTO dark visual, and "Continue" button. | P |
| `TC-COMM-AUTH-002` | Step through the 4 onboarding slides | Onboarding screen open at Step 1 | 1. Read Step 1 and tap "Continue"<br>2. Read Step 2 (QR Pay & Vouchers)<br>3. Read Step 3 (Safety & SOS)<br>4. Read Step 4 (Lost & Found) | Progress dots update smoothly from 1 to 4. Each step renders distinct accent colors, icons, and 3 feature highlight cards. Step 4 button changes to "Get Started". | P |
| `TC-COMM-AUTH-003` | Complete onboarding and verify persistence | On Step 4 of Onboarding | 1. Tap "Get Started"<br>2. Force close the app<br>3. Reopen the app | App saves key `@chatco_commuter_onboarding_completed = true`. Login screen is displayed immediately. Onboarding does not appear again. | P |
| `TC-COMM-AUTH-004` | Skip onboarding | On Step 1 of Onboarding | 1. Tap "Skip" in the top-right header | Onboarding exits immediately, flags completion in AsyncStorage, and transitions to Login. | P |
| `TC-COMM-AUTH-005` | Navigate backwards in onboarding | On Step 3 of Onboarding | 1. Tap "Back" | Transitions smoothly to Step 2 with preserved pagination state and highlights. | P |
| `TC-COMM-AUTH-006` | Valid Commuter login with Email | Approved commuter account exists | 1. Enter `juan.commuter@gmail.com`<br>2. Enter `Chatco@123`<br>3. Tap "Sign In" | Authenticates via `/api/v1/mobile/commuter/login`, stores Sanctum token securely in `expo-secure-store`, redirects to full-bleed Dashboard map with greeting: "Good morning, Juan!". | P |
| `TC-COMM-AUTH-007` | Valid Commuter login with Username | Approved commuter account exists | 1. Enter `juan.commuter`<br>2. Enter `Chatco@123`<br>3. Tap "Sign In" | Login succeeds and loads commuter profile seamlessly. | P |
| `TC-COMM-AUTH-008` | Login with incorrect password | Commuter account exists | 1. Enter valid email and wrong password<br>2. Tap "Sign In" | Displays inline error banner: "Invalid credentials". Password field remains clearable. | P |
| `TC-COMM-AUTH-009` | Login with unregistered email | Account does not exist | 1. Enter `unregistered@gmail.com`<br>2. Tap "Sign In" | Displays error banner: "Invalid credentials". No session created. | P |
| `TC-COMM-AUTH-010` | Login with blank credentials | On Login screen | 1. Leave fields blank<br>2. Tap "Sign In" | Inline form validation blocks submission: "Please enter your email or username" and "Please enter your password". | P |
| `TC-COMM-AUTH-011` | Commuter account pending admin approval | Account signed up but unverified by Admin | 1. Enter pending commuter credentials<br>2. Tap "Sign In" | Error banner displays: "Your account is pending admin approval." Commuter is blocked from accessing the dashboard. | P |
| `TC-COMM-AUTH-012` | Commuter account suspended | Admin marked commuter as suspended | 1. Enter suspended commuter credentials<br>2. Tap "Sign In" | Displays alert modal: "This account has been suspended by administration. Reason: [Reason]." | P |
| `TC-COMM-AUTH-013` | Commuter password visibility toggle | Password typed in login | 1. Type password<br>2. Tap eye icon | Password toggles between obscured dots (`••••••••`) and plain text. | P |
| `TC-COMM-AUTH-014` | Complete valid 4-step mobile registration | Unregistered email and contact number | 1. Tap "Sign Up"<br>2. Step 1: Enter First Name, Surname, Birthday, Gender, Commuter Type (Student)<br>3. Step 2: Enter Email, 09171234567, capture/upload School ID<br>4. Step 3: Enter 6-digit email OTP<br>5. Step 4: Create Username and Password | Transitions to "Registration Submitted!" confirmation screen. Informs commuter account is pending admin verification. | P |
| `TC-COMM-AUTH-015` | Registration invalid ID file format / size | Step 2 of Registration | 1. Attempt to upload a PDF or file > 5MB | Error banner displays: "That file type isn't supported. Upload a JPG, PNG, or WebP image under 5MB." | P |
| `TC-COMM-AUTH-016` | Registration OTP resend timer countdown | Step 3 of Registration | 1. Tap "Resend Code"<br>2. Attempt to tap immediately again | 60-second countdown timer initiates ("Resend available in 59s..."). Button is disabled until timer reaches 0. | P |
| `TC-COMM-AUTH-017` | Platform-scoped session isolation | Commuter logged in on Web browser | 1. Log in to Commuter Mobile app with same credentials<br>2. Refresh/navigate on Web browser | Both Web and Mobile sessions remain fully active concurrently. Mobile token carries `abilities: ["role:commuter", "platform:mobile"]`. Neither session drops. | P |
| `TC-COMM-AUTH-018` | Commuter logout | Logged in on Commuter Mobile | 1. Go to Profile<br>2. Tap "Log Out"<br>3. Confirm in modal | Revokes mobile Sanctum token from backend, purges secure storage, and returns to Login screen. | P |

---

## Phase M2: Real-Time Radar & Smart Hailing

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COMM-HAIL-019` | Full-bleed CARTO map initial load | Commuter logged in, on Home tab | 1. Inspect dashboard screen layout | CARTO Dark basemap renders full-bleed (`StyleSheet.absoluteFill`). Floating frosted glass greeting sits top-left; avatar sits top-right; bottom sliding sheet sits at bottom. No static header bar cuts into the map. | P |
| `TC-COMM-HAIL-020` | CARTO tile error automatic failover | CARTO API returns 401 or network blocked | 1. Simulate tile error on CARTO endpoint | Error listener triggers automatic silent fallback to OpenStreetMap tiles. Map continues rendering without gray screen or crashes. | P |
| `TC-COMM-HAIL-021` | Active jeepney markers on corridor | Shift active for Unit J-04 | 1. Observe corridor on map | Unit J-04 pin appears with vehicle icon, plate number badge, and route direction along McArthur Highway. | P |
| `TC-COMM-HAIL-022` | GPS location permission granted | App opened first time | 1. Grant "While using the app" permission | User's blue location beacon renders on map with pulsating accuracy ring. Status indicator displays "Live Tracking Active". | P |
| `TC-COMM-HAIL-023` | GPS location permission denied | Location permission disabled | 1. Deny location permission | Map defaults to route midpoint (Malolos/Bulacan). Status card displays yellow warning: "Location access denied. Enable location to see ETA and hail vehicles." | P |
| `TC-COMM-HAIL-024` | Commuter within 1km service radius | User within 800m of active Unit J-04 | 1. Open Dashboard sheet | Live ETA card turns emerald green: displays `~3 min`, `0.8 km away`, and plate `NDB-5821`. Circular "Hail Me" button illuminates orange (`#FF6D3A`) with glowing border. Subtext reads "HAIL ME". | P |
| `TC-COMM-HAIL-025` | Commuter outside 1km service radius | User > 1km from nearest unit | 1. Open Dashboard sheet | Status card shows: "Outside service radius. Move within 1km of a conductor unit to hail." Hail button turns disabled gray (`#374151`) with subtext "TOO FAR". | P |
| `TC-COMM-HAIL-026` | Trigger valid "Hail Me" request | In 1km radius, Hail button active | 1. Tap circular "Hail Me" button | Button initiates spinner -> turns pulsating red (`#EF4444`) with `X` icon. Subtext displays "CANCEL". 3-minute digital countdown begins. Conductor app receives incoming hail alert instantly. | P |
| `TC-COMM-HAIL-027` | Audible and haptic hail feedback | Hail button tapped | 1. Tap "Hail Me" on physical device | Device plays soft dual-tone chime and triggers haptic vibration pattern `[100, 50, 100]ms`. | P |
| `TC-COMM-HAIL-028` | Conductor accepts hail | Hail is pending | 1. Conductor taps "Accept" | Commuter sheet immediately updates with green banner: "Conductor Accepted! Unit J-04 is approaching your stop." | P |
| `TC-COMM-HAIL-029` | Conductor rejects hail | Hail is pending | 1. Conductor taps "Decline" | Commuter sheet displays notification: "Unit is currently at maximum capacity. Please hail the next approaching unit." Button resets to "HAIL ME". | P |
| `TC-COMM-HAIL-030` | Commuter cancels active hail | Hail is active (countdown running) | 1. Tap red "Cancel" button | Hail request is cancelled via `/api/v1/mobile/commuter/hail/{id}`. Conductor pin clears. Button returns to orange "HAIL ME". | P |
| `TC-COMM-HAIL-031` | Hail 3-minute auto-expiration | Hail active for 180 seconds | 1. Let timer reach 00:00 without conductor action | Hail auto-expires on backend. App plays subtle reminder tone and resets button to "HAIL ME". | P |
| `TC-COMM-HAIL-032` | Hail unit that is on break | Conductor has set status to "On Break" | 1. Attempt to hail unit | System prevents hail: "Vehicle is currently on break. Nearest active unit will be hailed." | P |
| `TC-COMM-HAIL-033` | Expand and collapse bottom sheet | On Dashboard | 1. Tap drag handle / "Tools" bar | Sheet collapses down to 38px height with "TOOLS" label, giving unobstructed map view. Tapping again smoothly expands full tools. | P |

---

## Phase M3: Cashless GCash Checkout & Ride Payments

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COMM-PAY-034` | Open GCash payment card | Logged in on Home tab | 1. Tap blue "Pay with GCash" card in sliding sheet | Opens full-screen `QrScannerModal` with live viewfinder and targeting reticle. | P |
| `TC-COMM-PAY-035` | Scan valid conductor vehicle QR code | Conductor generated GCash fare QR | 1. Point camera at conductor QR | Viewfinder beeps and vibrates. Modal resolves crew details: Unit J-04, Conductor C. Dela Cruz, Fare Amount ₱15.00. Prompts "Proceed to GCash Checkout". | P |
| `TC-COMM-PAY-036` | Student concession discount applied | Commuter is verified Student (20% discount) | 1. Scan fare QR for ₱15.00 regular trip | Fare checkout displays regular ₱15.00, discount -₱3.00, final payable ₱12.00 with badge "Student 20% Applied". | P |
| `TC-COMM-PAY-037` | Senior Citizen / PWD discount applied | Commuter is verified Senior / PWD | 1. Scan fare QR for ₱25.00 trip | Calculates 20% discount: ₱20.00 final amount. Concession role noted in transaction metadata. | P |
| `TC-COMM-PAY-038` | Camera permission denied, switch to manual token | Camera permission blocked in device settings | 1. Tap "Pay with GCash"<br>2. Tap "Enter token manually" | Input field appears. Allows entering 6-character alphanumeric QR token (e.g. `K9X2P4`). | P |
| `TC-COMM-PAY-039` | Paste invalid / non-existent QR token | Manual entry open | 1. Enter `INVALID`<br>2. Tap "Resolve Token" | Inline error displays: "We don't recognise this QR code. Please verify with conductor." | P |
| `TC-COMM-PAY-040` | Redirect to GCash Payment Gateway | Valid checkout generated | 1. Tap "Continue to GCash" | Deep-links to GCash app or opens secure GCash gateway in browser webview with pre-filled reference and exact fare amount. | P |
| `TC-COMM-PAY-041` | Successful GCash payment return | Commuter completed payment in GCash | 1. Complete payment and return to app | App displays green checkmark: "Payment Successful! Receipt Reference: GC-9482104". Conductor terminal receives live update: "PAID". | P |
| `TC-COMM-PAY-042` | Cancel on GCash gateway | On GCash webview | 1. Tap "Cancel" or return back | Displays notice: "The payment was cancelled. Please try again or pay with cash." | P |
| `TC-COMM-PAY-043` | QR already claimed by another commuter | Another passenger scanned same single QR | 1. Scan the already-claimed QR | Error banner shows: "This payment has already been claimed by another commuter. Please ask conductor for a new QR." | P |
| `TC-COMM-PAY-044` | Group ride payment checkout | Conductor generated group fare (3 pax) | 1. Scan group fare QR | Checkout modal reflects: "Group Ride (3 Passengers)". Gross: ₱45.00. One single GCash transaction covers entire group. | P |
| `TC-COMM-PAY-045` | View Payment History modal | Paid rides exist | 1. Tap clock icon on GCash Pay card | Opens `PaymentHistoryModal` displaying list of past rides with date, unit, route, amount, and payment method badge (`GCASH` / `CASH`). | P |
| `TC-COMM-PAY-046` | Filter payment history | History modal open | 1. Filter by "This Week", then "This Month" | Records filter instantly with total spent recalculating dynamically. | P |
| `TC-COMM-PAY-047` | Open trip feedback from payment history | Trip completed without feedback | 1. Tap "Leave Feedback" on past trip row | Closes history modal and deep-links directly to Feedback screen with pre-filled crew details. | P |

---

## Phase M4: Paper Receipt Scanner & Rewards Wallet

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COMM-REWARD-048` | Open paper receipt scanner from Rewards | Commuter paid via cash, holds thermal paper receipt | 1. Go to Rewards tab<br>2. Tap QR scanner button in top-right header | Opens `ReceiptScanModal` with camera targeting receipt barcode/QR. | P |
| `TC-COMM-REWARD-049` | Scan valid paper cash receipt | Receipt contains valid 6-char token | 1. Scan receipt QR | Chime sounds. Displays success banner: "Receipt Claimed! ₱15.00 cash ride added to your rewards progress." Progress bar advances by 1 ride. | P |
| `TC-COMM-REWARD-050` | Enter paper receipt token manually | Holding paper receipt | 1. Tap "Enter 6-character receipt code"<br>2. Type token (e.g. `R7C2M8`)<br>3. Tap "Claim Receipt" | Successfully claims receipt. Increments commuter's ride cycle count. | P |
| `TC-COMM-REWARD-051` | Claim already claimed receipt | Receipt was already claimed | 1. Scan same receipt a second time | Error displays: "You have already claimed this receipt." Ride count does not duplicate. | P |
| `TC-COMM-REWARD-052` | Claim receipt claimed by different commuter | Commuter B scans Commuter A's receipt | 1. Scan the used receipt | Error displays: "This receipt has already been claimed by another commuter." | P |
| `TC-COMM-REWARD-053` | Claim expired paper receipt | Receipt date > claim window (e.g. 7 days) | 1. Scan expired receipt | Error displays: "Receipt Expired. Cash receipts must be claimed within 7 days of issuance." | P |
| `TC-COMM-REWARD-054` | 10-Ride reward progress cycle bar | Commuter has 7 completed cashless/cash claimed rides | 1. View Free Ride Progress card on Rewards tab | Displays "7 / 10 rides completed", progress bar at 70%, and subtitle "3 more rides until your next free ride voucher!". | P |
| `TC-COMM-REWARD-055` | Unlock Free Ride Voucher on 10th ride | Commuter at 9 rides, claims 10th ride | 1. Complete 10th ride payment or receipt claim | Celebration modal triggers: "🎉 Free Ride Unlocked!". New voucher appears in "Available Vouchers" section with 30-day validity. Cycle counter resets to 0/10. | P |
| `TC-COMM-REWARD-056` | View available vouchers in wallet | Commuter holds 1 active voucher | 1. Open Rewards tab | Voucher ticket card displays: "100% OFF Modern Jeepney Ride", expiry date, and "Use Voucher" action button. | P |
| `TC-COMM-REWARD-057` | Open Conductor Activation Code modal | Voucher is available | 1. Tap "Use Voucher" | Modal reveals large scannable Voucher QR code and human-readable 6-character code (e.g. `VCH-7X9`) to present to conductor. | P |
| `TC-COMM-REWARD-058` | Copy voucher code to clipboard | Activation modal open | 1. Tap "Copy Code" button | Copies code to system clipboard and displays toast: "Voucher code copied!". | P |
| `TC-COMM-REWARD-059` | Redeem voucher for GCash checkout | Voucher available, scanning fare QR | 1. Scan conductor's GCash QR<br>2. Select "Apply Free Ride Voucher" | Payable amount updates to ₱0.00: "Voucher covers this ride in full — no GCash payment needed." Confirms ride immediately. | P |
| `TC-COMM-REWARD-060` | View Archived / Used Vouchers | Past vouchers redeemed | 1. Scroll to "Voucher History" | Lists past vouchers with `USED` status badge and timestamp of redemption. | P |
| `TC-COMM-REWARD-061` | Dynamic Announcements feed display | Admin published System & Promo announcements | 1. Scroll to "Latest Updates" on Rewards tab | Announcements display with categorized badges (`PROMO` 🎉, `SAFETY` 🛡️, `ADVISORY` 🚧) and relative timestamp. Unread items have orange indicator dot. | P |
| `TC-COMM-REWARD-062` | View full announcement modal & mark as read | Unread announcement exists | 1. Tap announcement card | Opens modal with complete announcement message. Orange unread dot clears and layout bottom badge decrements by 1. | P |
| `TC-COMM-REWARD-063` | Mark all announcements as read | 3 unread announcements exist | 1. Tap "Mark all as read" button | All unread dots disappear. Bottom nav Rewards badge count clears to 0. | P |

---

## Phase M5: Commuter Safety Shield & Emergency Response

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COMM-SAFE-064` | Generate 30-minute Share Ride tracking link | Commuter on active transit, GPS enabled | 1. Tap "Share Ride" button on Dashboard | Creates live tracking link via `/api/v1/mobile/commuter/share-ride`. Modal displays URL `https://chatco.ph/track/{token}` with 30:00 countdown timer. | P |
| `TC-COMM-SAFE-065` | Copy and share tracking link | Share Ride modal open | 1. Tap "Copy Link" or "Share Link" | Copies URL to clipboard or opens native iOS/Android share sheet (SMS, WhatsApp, Messenger). | P |
| `TC-COMM-SAFE-066` | Continuous GPS broadcast during ride share | Sharing is active | 1. Move along corridor for 5 minutes | App broadcasts updated coordinates every 10 seconds to backend. Family viewing link sees live pin moving on CARTO map. | P |
| `TC-COMM-SAFE-067` | Manually terminate ride share | Sharing is active | 1. Open Share modal<br>2. Tap "Stop Sharing" | Terminates tracking session. Public link transitions to "Ride Completed / Tracking Ended". | P |
| `TC-COMM-SAFE-068` | Share link automatic expiration | Link generated 30 minutes ago | 1. Let timer expire | Link expires automatically. Anyone accessing URL sees "This tracking link has expired." | P |
| `TC-COMM-SAFE-069` | Emergency SOS double-tap protection | On Dashboard | 1. Tap "Emergency SOS" once | Button changes text to red: "Tap SOS again". SOS is NOT triggered yet (prevents accidental pocket taps). | P |
| `TC-COMM-SAFE-070` | Trigger confirmed Emergency SOS | "Tap SOS again" is displayed | 1. Tap button a second time within 1.5 seconds | Modal triggers: "EMERGENCY SOS BROADCAST ACTIVE". Coordinates sent to Admin Dispatch, emergency alert email dispatched, siren haptic vibrates device. | P |
| `TC-COMM-SAFE-071` | Emergency SOS rate limiting | SOS was just triggered | 1. Attempt to send another SOS within 60 seconds | Toast warns: "You have already sent an SOS recently. Please wait before trying again." | P |
| `TC-COMM-SAFE-072` | One-tap PNP Police 911 hotline dial | SOS modal open | 1. Tap "Dial PNP 911" button | Native phone dialer opens with `911` pre-filled ready for one-tap calling. | P |
| `TC-COMM-SAFE-073` | One-tap BFP Fire / Rescue 160 hotline dial | SOS modal open | 1. Tap "Dial BFP 160" button | Native phone dialer opens with `160` pre-filled. | P |

---

## Phase M6: Centralized Lost & Found Recovery

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COMM-LOST-074` | View Lost & Found catalog | Commuter on Lost & Found tab | 1. Inspect screen layout | Segmented control displays 3 tabs: "All Items", "Watchlist", "Claims". Item cards show photo thumbnail, item title, category badge, found date, and unit plate. | P |
| `TC-COMM-LOST-075` | Search lost items by keyword | Items exist in catalog | 1. Type "wallet" in search input | Catalog filters instantly to matching items across title, description, and unit notes. | P |
| `TC-COMM-LOST-076` | Filter items by category chip | On "All Items" tab | 1. Tap "Gadgets & Electronics" chip | Displays only gadgets (smartphones, earphones, powerbanks). Non-matching categories hidden. | P |
| `TC-COMM-LOST-077` | Filter items by date lost | On "All Items" tab | 1. Pick specific date from date picker | Catalog shows items recovered on that specific date. | P |
| `TC-COMM-LOST-078` | View complete item detail modal | Item card visible | 1. Tap item card | Opens modal displaying high-resolution image, full description, recovered unit (`J-04`), driver/conductor names, and status badge (`AVAILABLE`). | P |
| `TC-COMM-LOST-079` | Add item to personal watchlist | On item card | 1. Tap bookmark icon | Bookmark fills blue. Item is pinned to commuter's "Watchlist" tab. | P |
| `TC-COMM-LOST-080` | Remove item from watchlist | On Watchlist tab | 1. Tap bookmark icon on watched item | Item is removed from Watchlist tab immediately. | P |
| `TC-COMM-LOST-081` | File claim for lost item | Available item open | 1. Tap "Claim Item"<br>2. Fill in unique identifying marks/proof: "Black leather wallet with PhilHealth ID inside"<br>3. Enter contact: `09171234567`<br>4. Submit | Claim is recorded via `/api/v1/lost-found/{id}/claim`. Status moves to `PENDING` ("Waiting for staff review"). Item moves to "Claims" tab. | P |
| `TC-COMM-LOST-082` | File claim with blank proof | Claim form open | 1. Leave proof description blank<br>2. Tap Submit | Validation alert displays: "Please describe identifying details or unique marks." Submission blocked. | P |
| `TC-COMM-LOST-083` | Admin approves claim — commuter notification | Claim reviewed and approved by staff | 1. Open app or check Lost & Found tab | Nav badge increments. Claim status updates to green `APPROVED / READY` with instruction: "Approved! Bring valid ID to terminal office to claim." | P |
| `TC-COMM-LOST-084` | Admin rejects claim | Staff marked claim invalid | 1. Open Claims tab | Status updates to red `REJECTED` with staff rejection rationale (e.g. "Identifying details do not match item contents"). | P |
| `TC-COMM-LOST-085` | Cancel pending claim | Claim is in `PENDING` status | 1. Tap "Cancel Claim"<br>2. Confirm in dialog | Claim is withdrawn. Item returns to available catalog for other claimants. | P |
| `TC-COMM-LOST-086` | Maximum 3 rejected claims threshold | Commuter had 3 rejected claims on item | 1. Attempt to file 4th claim on same item | System blocks submission: "You have reached the maximum number of rejected claims for this item." | P |
| `TC-COMM-LOST-087` | Item released by staff | Item physically handed to commuter | 1. Open Claims tab | Claim displays final blue badge: `RELEASED` with timestamp and releasing officer details. | P |

---

## Phase M7: Crew Ride Feedback & Rating

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COMM-FEED-088` | Open feedback unit scanner | Commuter on Feedback tab | 1. View Feedback screen | Opens in-page unit QR scanner with manual token entry option below. | P |
| `TC-COMM-FEED-089` | Scan vehicle feedback QR code | Unit J-04 feedback QR | 1. Scan unit QR code | Viewfinder resolves crew: Unit J-04, Driver R. Santos, Conductor C. Dela Cruz, Calumpit - Meycauayan Line. Opens dual rating form. | P |
| `TC-COMM-FEED-090` | Rate Driver with 5-star rating | Crew rating form open | 1. Tap 5th star on Driver section | All 5 stars illuminate gold (`#FBBF24`). Rating label shows "Excellent". Positive tag chips expand. | P |
| `TC-COMM-FEED-091` | Select Driver feedback tag chips | 5-star rating selected | 1. Tap "Safe Driving" and "Smooth Ride" | Tag chips highlight blue (`#1A5FB4`). Selected tags added to submission payload. | P |
| `TC-COMM-FEED-092` | Rate Driver with 1-star (negative feedback) | Rating form open | 1. Tap 1st star on Driver section | Star illuminates. Label shows "Terrible". Negative tags expand: "Reckless Driving", "Loud Music", "Overspeeding". | P |
| `TC-COMM-FEED-093` | Rate Conductor section | Conductor section visible | 1. Tap 4 stars for Conductor<br>2. Select tags "Polite" and "Honest Change" | Conductor rating and tags are selected. Both crew sections are now satisfied. | P |
| `TC-COMM-FEED-094` | Submit feedback with optional comment | Driver and Conductor rated | 1. Enter comment: "Driver was very careful during rain."<br>2. Tap "Submit Feedback" | Feedback submitted via `/api/v1/mobile/commuter/feedback`. Green success screen appears: "Thank You! Your feedback has been recorded." | P |
| `TC-COMM-FEED-095` | Auto-redirect to Dashboard after feedback | Feedback submitted | 1. Observe screen for 3 seconds | 3-second countdown completes ("Redirecting in 3... 2... 1..."). Transitions cleanly back to Dashboard. | P |
| `TC-COMM-FEED-096` | Submit without rating conductor | Driver rated, conductor untouched | 1. Tap "Submit Feedback" | Alert blocks submission: "Please rate both the driver and the conductor before submitting." | P |
| `TC-COMM-FEED-097` | Prevent duplicate feedback for same ride | Feedback already submitted for shift | 1. Scan same unit QR again | Error banner shows: "You have already left feedback for this ride today. Thank you for helping us improve!" | P |

---

## Phase M8: Commuter Profile & Account Security

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COMM-PROF-098` | View Profile details | Logged in as commuter | 1. Open Profile tab | Displays circular avatar with initials, full name, `@username`, verification badge, commuter type (Student), and read-only personal fields (Email, Birthdate). | P |
| `TC-COMM-PROF-099` | Edit contact number | Profile tab open | 1. Tap "Edit Profile"<br>2. Change contact to `09189876543`<br>3. Tap "Save Changes" | Updates contact via PUT `/api/v1/mobile/commuter/profile`. Toast confirms: "Profile updated successfully!". Contact number updates across all modals. | P |
| `TC-COMM-PROF-100` | Edit with invalid contact number format | Edit profile mode active | 1. Enter `0917`<br>2. Tap "Save Changes" | Validation error displays: "Enter an 11-digit mobile number starting with 09 (e.g. 09171234567)." | P |
| `TC-COMM-PROF-101` | Request 2-Step Password Reset Code | Profile tab open | 1. Tap "Change Password"<br>2. Enter current password and new valid password<br>3. Tap "Continue" | System sends 6-digit OTP code to registered email address. Modal transitions to Code Verification step. | P |
| `TC-COMM-PROF-102` | Change password with wrong current password | In Change Password modal | 1. Enter wrong current password<br>2. Enter new password<br>3. Tap "Continue" | Error banner shows: "The provided current password is incorrect." Code is not sent. | P |
| `TC-COMM-PROF-103` | Change password confirmation mismatch | In Change Password modal | 1. Enter two different new passwords | Error banner shows: "The new password confirmation does not match." | P |
| `TC-COMM-PROF-104` | Change password weak password rules | In Change Password modal | 1. Enter `chatco12` (no uppercase or symbol) | Checklist highlights missing requirements: (8+ chars, uppercase, number, symbol). | P |
| `TC-COMM-PROF-105` | Enter wrong email verification OTP | Code verification step | 1. Enter `999999` | Error banner shows: "That code is incorrect. Please check your email." | P |
| `TC-COMM-PROF-106` | Enter correct OTP and confirm password reset | Valid OTP received | 1. Enter valid 6-digit code<br>2. Tap "Confirm Change" | Password updated successfully via `/api/v1/mobile/commuter/change-password/confirm`. Modal closes and success banner appears. Old password no longer works. | P |
| `TC-COMM-PROF-107` | Replay App Guide & Walkthrough from Profile | Profile tab open | 1. Tap "App Features & Guide" card | Launches the 4-step first-launch Onboarding Screen walkthrough. Commuter can review all features and return to profile. | P |
| `TC-COMM-PROF-108` | Replay App Guide from Top Header Bar | On any secondary tab | 1. Tap `?` help circle icon in top header | Launches the interactive walkthrough guide immediately. | P |
| `TC-COMM-PROF-109` | Logout confirmation modal | Profile tab open | 1. Tap "Log Out"<br>2. Tap "Cancel"<br>3. Tap "Log Out" again and confirm | Tap 1 cancels and remains in profile. Tap 2 logs out, purges tokens, and returns to Login. | P |

---

# SECTION 2: CHATCO CONDUCTOR MOBILE APPLICATION

## Phase C1: Conductor Login & Shift Initialization

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COND-AUTH-110` | Valid Conductor login | Conductor account created by admin | 1. Launch `chatco-mobile`<br>2. Enter `c.delacruz`<br>3. Enter `Chatco@123`<br>4. Tap "Sign In" | Authenticates via `/api/v1/mobile/conductor/login`, saves Sanctum token with `abilities: ["role:conductor", "platform:mobile"]`, redirects to Unit Verification screen. | P |
| `TC-COND-AUTH-111` | View available vehicles and drivers | Conductor logged in, no active shift | 1. Inspect Unit Verification screen | Available units (`J-04`, `J-08`) and active drivers are listed in dropdown selectors. | P |
| `TC-COND-AUTH-112` | Start shift with valid unit and driver | Unit J-04 and Driver R. Santos available | 1. Select Unit `J-04`<br>2. Select Driver `R. Santos`<br>3. Review Shift Setup summary<br>4. Tap "Confirm Shift Setup" | Shift starts successfully. Operating device token registered. Conductor Dashboard opens with route Calumpit – Meycauayan. | P |
| `TC-COND-AUTH-113` | Start shift without selecting unit or driver | Unit Verification open | 1. Leave selectors blank<br>2. Tap "Confirm Shift Setup" | Validation error blocks start: "Vehicle and driver selection are required to start a shift." | P |
| `TC-COND-AUTH-114` | Unit already on active shift by another conductor | Unit J-04 active on another shift | 1. Attempt to start shift on Unit J-04 | Error banner: "Vehicle is already assigned to an active shift." | P |
| `TC-COND-AUTH-115` | Driver already on active shift | Driver R. Santos active on another unit | 1. Attempt to select Driver R. Santos | Error banner: "Driver is already on an active shift." | P |
| `TC-COND-AUTH-116` | Conductor already has an open shift | Conductor has active shift from earlier | 1. Log in from mobile app | Automatically bypasses Unit Verification and re-hydrates active shift dashboard directly. | P |
| `TC-COND-AUTH-117` | Unit set to Maintenance mode by Admin | Admin set Unit J-04 to Maintenance | 1. Select Unit J-04 | Error banner: "This vehicle is currently under maintenance and cannot be operated." | P |
| `TC-COND-AUTH-118` | Start shift during Maintenance Mode | Admin activated system Maintenance Mode | 1. Attempt to start shift | Banner blocks start: "CHATCO is under maintenance right now. Shifts cannot be started until complete." | P |
| `TC-COND-AUTH-119` | Password visibility toggle | On conductor login | 1. Type password<br>2. Tap eye toggle | Password toggles between obscured dots and plain text. | P |
| `TC-COND-AUTH-120` | Deactivated conductor account login | Admin disabled conductor account | 1. Enter credentials for disabled conductor | Error displays: "This conductor account has been deactivated. Please contact admin." | P |
| `TC-COND-AUTH-121` | Conductor session isolation | Conductor logged in on Web portal | 1. Log in to Conductor Mobile app with same account | Mobile session establishes independently with mobile platform scope. Both can query shift data without dropouts. | P |

---

## Phase C2: Operating Device Ownership & Handoff

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COND-DEV-122` | Shift opened on second device (Device B) | Shift active on Device A (owns shift) | 1. Log in on Device B with same conductor credentials<br>2. Open Dashboard | Device B detects Device A owns the shift. Device B renders in **View-Only Mode** with banner: "Shift active on another device. Choose operating device to take over." | P |
| `TC-COND-DEV-123` | Collect fare on view-only device blocked | Device B is in view-only mode | 1. Attempt to record fare or generate QR on Device B | Action is blocked: "This shift is active on another device. Sync and release that device before collecting fares here." | P |
| `TC-COND-DEV-124` | Release shift for handoff on Device A | Shift active on Device A | 1. On Device A, open Settings / Shift Options<br>2. Tap "Release for Handoff"<br>3. Confirm | Device A syncs all local transactions and releases ownership. Displays: "Shift is ready to be claimed by another device." | P |
| `TC-COND-DEV-125` | Claim released shift on Device B | Device A released shift | 1. On Device B, tap "Claim Operating Device" | Device B acquires shift ownership token. Full fare collection and controls unlock immediately. | P |
| `TC-COND-DEV-126` | Claim while Device A has not released | Device A still holds ownership | 1. On Device B, attempt to claim shift | Error displays: "Another device still owns this shift. Release it there before claiming this device." | P |
| `TC-COND-DEV-127` | Block handoff when offline cash is unsynced | Device A recorded fares while offline | 1. Attempt to tap "Release for Handoff" on Device A while offline | Warning blocks handoff: "Offline cash fares are still waiting to sync. Reconnect device to sync before handoff." | P |
| `TC-COND-DEV-128` | Emergency shift recovery by Admin | Device A lost or damaged during shift | 1. Admin triggers "Device Recovery" in admin panel<br>2. Conductor on Device B claims shift | Device B successfully claims shift. Old Device A ownership token is permanently invalidated. | P |
| `TC-COND-DEV-129` | Old device attempts to operate after admin recovery | Device A recovered by admin | 1. Reconnect Device A and attempt fare action | Error displays: "An administrator released this device from the shift. Please log in again." | P |

---

## Phase C3: Live Status, GPS Broadcast & Capacity

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COND-STAT-130` | Real-time GPS broadcasting | Shift active, location permission granted | 1. Device moves along McArthur Highway corridor | Transmits coordinates every 5 seconds to `/api/v1/mobile/conductor/location`. Unit marker moves accurately on Admin and Commuter maps. | P |
| `TC-COND-STAT-131` | Location permission denied warning | Shift active, GPS disabled | 1. Disable location in phone settings | Dashboard displays high-priority GPS warning banner: "GPS signal lost. Enable location for live radar tracking." Admin map marks unit as "Awaiting GPS". | P |
| `TC-COND-STAT-132` | Toggle passenger capacity to "Standing" | Shift active, seats full | 1. Tap capacity selector -> Select "Standing" | Capacity status updates instantly to "Standing". Commuter app updates unit badge to show standing room available. | P |
| `TC-COND-STAT-133` | Toggle passenger capacity to "Full" | Shift active | 1. Tap capacity selector -> Select "Full" | Unit marks as "Full". Commuters cannot hail unit while full. | P |
| `TC-COND-STAT-134` | Toggle passenger capacity to "Available" | Passengers alight | 1. Tap capacity selector -> Select "Available" | Capacity resets to available with seat count visible to commuters. | P |
| `TC-COND-STAT-135` | Start shift break duty | Shift active | 1. Use "Slide to Start Break" slider<br>2. Confirm break start | Conductor status updates to "Conductor on Break". Unit hides from commuter hail radar. Admin monitoring reflects "On Break". | P |
| `TC-COND-STAT-136` | Resume shift duty from break | Conductor is on break | 1. Use "Slide to Resume Duty" slider | Status restores to "Conductor on Duty". Unit reappears on commuter hail radar. | P |
| `TC-COND-STAT-137` | Network loss offline indicator banner | Shift active | 1. Enable Airplane mode on phone | Amber top banner appears: "Offline Mode Active. Cash fares will be stored locally and synced when online." | P |
| `TC-COND-STAT-138` | Network restoration and auto-sync | Device was offline with banner | 1. Disable Airplane mode | Banner transitions to green: "Online. Syncing offline transactions..." then disappears once synced. | P |
| `TC-COND-STAT-139` | Battery saver / background tracking | Device locked during transit | 1. Lock screen while vehicle moves | Background geolocation task (`expo-task-manager`) maintains periodic coordinate pings along the route. | P |

---

## Phase C4: Offline-First Fare Calculator & Ticketing

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COND-FARE-140` | Fare calculation by origin and destination | Shift active | 1. Open Fare Calculator<br>2. Select Origin: "Calumpit Junction"<br>3. Select Destination: "Malolos Crossing" | Displays exact fare according to published fare matrix (e.g. ₱20.00 regular, ₱16.00 discounted). | P |
| `TC-COND-FARE-141` | Search stop by landmark or barangay | Fare calculator open | 1. Type "Capitol" in stop search bar | Dropdown filters instantly to "Bulacan Provincial Capitol" stop. | P |
| `TC-COND-FARE-142` | Apply Student concession fare | Origin and Destination selected | 1. Select passenger type: "Student" | Fares recalculate to 20% concession rate (₱16.00 instead of ₱20.00). | P |
| `TC-COND-FARE-143` | Apply Senior Citizen / PWD concession fare | Origin and Destination selected | 1. Select "Senior Citizen" or "PWD" | Fares recalculate to 20% concession rate. Concession tag attached to receipt. | P |
| `TC-COND-FARE-144` | Record single cash fare payment | Fare calculated (₱20.00) | 1. Tap "Cash"<br>2. Tap "Confirm Payment" | Records cash transaction. Displays receipt summary with 6-character claim token (e.g. `T7K9P2`). Increments shift cash total by ₱20.00. | P |
| `TC-COND-FARE-145` | Group cash fare calculation (multiple passengers) | Fare calculator open | 1. Select "Multiple - Enter quantities"<br>2. Enter 2 Regular and 2 Student<br>3. Calculate | Calculates: (2 x ₱20) + (2 x ₱16) = ₱72.00 total. Records single group cash ticket. | P |
| `TC-COND-FARE-146` | Record cash fare while completely offline | Device in Airplane mode | 1. Calculate fare<br>2. Select "Cash"<br>3. Tap "Confirm Payment" | Saves transaction into offline queue in local storage (`@chatco_conductor_offline_fares`). Generates local offline receipt token. Shifts cash total increments. | P |
| `TC-COND-FARE-147` | Background sync of offline cash queue | 3 cash fares stored offline | 1. Reconnect phone to WiFi/mobile data | Background queue processor POSTs transactions to `/api/v1/mobile/conductor/fares/sync-batch`. Replaces offline IDs with permanent server IDs without duplicates. | P |
| `TC-COND-FARE-148` | Prevent duplicate submission on double-tap | Fare confirmation button | 1. Rapidly double-tap "Confirm Payment" | Button debounces immediately on first tap. Only one transaction is generated. | P |
| `TC-COND-FARE-149` | View shift transaction history | Fares recorded during shift | 1. Open "Transactions History" tab | Chronological list of all fares collected with timestamp, passenger count, fare amount, and payment method (`CASH`, `GCASH`, `VOUCHER`). | P |
| `TC-COND-FARE-150` | Filter shift transactions | History open | 1. Filter by "Cash Only", then "GCash Only" | List filters dynamically, displaying subtotal for filtered category. | P |
| `TC-COND-FARE-151` | Thermal Bluetooth receipt printer pairing | Bluetooth enabled, portable printer on | 1. Tap "Connect Printer"<br>2. Select paired printer | Connects successfully. Prints test receipt: "CHATCO Modern Transit - Calumpit Line". | P |
| `TC-COND-FARE-152` | Print paper cash receipt | Fare confirmed, printer connected | 1. Tap "Print Receipt" | Printer outputs paper ticket: Bus Unit, Conductor Name, Origin, Destination, Amount, Barcode, and 6-char Claim Token. | P |
| `TC-COND-FARE-153` | Reprint previous receipt | Commuter asks for receipt copy | 1. Open Transactions History<br>2. Select last transaction<br>3. Tap "Reprint" | Prints identical ticket with label "DUPLICATE RECEIPT". | P |
| `TC-COND-FARE-154` | Reverse / void accidental fare | Misentered cash transaction | 1. Open transaction within 2 minutes<br>2. Tap "Void Fare"<br>3. Enter reason | Transaction marks as `VOIDED`. Deducts amount from shift cash tally and logs audit record. | P |

---

## Phase C5: Conductor GCash QR & Voucher Redemption

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COND-PAY-155` | Generate dynamic GCash fare QR code | Fare calculated (₱20.00), device online | 1. Select "GCash"<br>2. Tap "Generate QR Code" | Displays high-contrast QR code on conductor screen with amount ₱20.00 and status: "Waiting for commuter scan…". | P |
| `TC-COND-PAY-156` | Real-time payment confirmation on QR | Commuter scans and pays via GCash | 1. Commuter completes checkout | Screen immediately updates with green checkmark and audio bell: "Payment Successful! ₱20.00 received via GCash." Increments shift GCash total. | P |
| `TC-COND-PAY-157` | Cancel active GCash QR | QR displayed on screen | 1. Tap "Cancel Payment" | Cancels transaction on backend. QR is invalidated. Returns to fare calculator. | P |
| `TC-COND-PAY-158` | Dynamic GCash QR expiration | QR displayed for > 3 minutes | 1. Wait for timer expiration | Displays message: "This QR code has expired. Tap to generate a new QR." | P |
| `TC-COND-PAY-159` | Block GCash QR generation while offline | Device has no internet connection | 1. Attempt to generate GCash QR | Warning banner displays: "GCash requires an active internet connection. Please accept cash while offline." | P |
| `TC-COND-PAY-160` | Redeem valid commuter Free Ride Voucher | Commuter presents voucher code `VCH-7X9` | 1. Select "Apply Voucher (Free Ride)"<br>2. Enter code `VCH-7X9`<br>3. Tap "Verify & Apply" | Code verifies via backend: "Valid Voucher: 100% Free Ride". Fare records at ₱0.00. Shifts voucher count increments by 1. | P |
| `TC-COND-PAY-161` | Scan commuter voucher QR code | Commuter presents voucher QR on phone | 1. Tap "Scan Voucher QR"<br>2. Aim camera at commuter phone | Scanner reads voucher token instantly and applies discount. | P |
| `TC-COND-PAY-162` | Enter invalid or non-existent voucher code | Voucher screen open | 1. Enter `VCH-000`<br>2. Tap "Verify & Apply" | Error displays: "Invalid voucher code. Please check code or ask commuter to re-open wallet." | P |
| `TC-COND-PAY-163` | Enter already redeemed / used voucher | Voucher was used earlier | 1. Enter used voucher code | Error displays: "This voucher has already been redeemed on [Date]." | P |
| `TC-COND-PAY-164` | Enter expired voucher | Voucher validity ended | 1. Enter expired voucher code | Error displays: "This voucher has expired." | P |
| `TC-COND-PAY-165` | Block voucher redemption while offline | Device in Airplane mode | 1. Attempt to apply voucher | Warning displays: "Voucher validation requires internet connection to prevent reuse. Use cash while offline." | P |
| `TC-COND-PAY-166` | Group ride with 1 voucher applied | Group of 3 passengers, 1 voucher presented | 1. Apply 1 voucher to group ride | System applies voucher to 1 seat (₱0.00). Remaining 2 seats prompt for cash/GCash payment. | P |

---

## Phase C6: Real-Time Hail Management & Dispatch

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COND-HAIL-167` | Receive incoming commuter hail alert | Shift active, unit within 1km of commuter | 1. Commuter taps "Hail Me" on mobile | High-priority pop-over alert appears on conductor dashboard with loud audio chime and vibration. Shows: "Incoming Hail: [Stop Name], 1 Passenger, 450m away". | P |
| `TC-COND-HAIL-168` | Accept commuter hail | Incoming hail alert visible | 1. Tap "Accept Hail" button | Hail changes status to `ACCEPTED`. Commuter app receives instant confirmation. Route pin updates with passenger indicator. | P |
| `TC-COND-HAIL-169` | Decline commuter hail | Unit full or approaching terminal | 1. Tap "Decline" button | Hail marks as declined. Alert dismisses. Commuter app receives polite notice to hail next unit. | P |
| `TC-COND-HAIL-170` | Commuter cancels hail before conductor acts | Hail alert visible | 1. Commuter cancels on their phone | Conductor hail modal dismisses automatically with subtle notification: "Hail was cancelled by commuter." | P |
| `TC-COND-HAIL-171` | Hail expires automatically | Conductor did not act for 3 minutes | 1. Let hail alert time out | Alert dismisses automatically without blocking conductor screen. | P |
| `TC-COND-HAIL-172` | Block hails while unit status is Full | Conductor marked capacity as "Full" | 1. Commuter attempts to hail | Conductor does not receive hail alert. Backend filters full unit from dispatch radar. | P |
| `TC-COND-HAIL-173` | Block hails while conductor is on break | Status is "On Break" | 1. Commuter attempts to hail | Conductor does not receive alerts. | P |
| `TC-COND-HAIL-174` | Multiple incoming hails queue | 2 commuters hail along corridor | 1. Receive 2 hails within 15 seconds | Displays queue counter ("2 Hails Pending"). Allows accepting or declining each in order. | P |

---

## Phase C7: Conductor Emergency SOS & Incident Logging

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COND-SAFE-175` | Conductor triggers Emergency SOS | Shift active, vehicle emergency | 1. Tap red "SOS" button on header<br>2. Confirm "Send Emergency SOS?" in modal | Broadcasts high-priority alert with live coordinates, unit number (`J-04`), driver and conductor details to Admin Dashboard and dispatch email. | P |
| `TC-COND-SAFE-176` | Emergency SOS rate limiting | SOS was just triggered | 1. Attempt to send another SOS within 60 seconds | Warning displays: "Too many requests. Please slow down. Emergency alert is already active." | P |
| `TC-COND-SAFE-177` | Display emergency response hotlines | SOS modal open | 1. View emergency dialog | Displays direct speed-dial buttons for local PNP Station and modern jeepney fleet emergency dispatch. | P |
| `TC-COND-SAFE-178` | Admin acknowledges conductor SOS | Conductor SOS is active | 1. Admin clicks "Acknowledge" on web | Conductor screen displays banner: "SOS Acknowledged by Admin Dispatch. Help is on the way." | P |
| `TC-COND-SAFE-179` | Log vehicle breakdown incident | Mechanical issue occurred | 1. Open Incidents menu<br>2. Select "Vehicle Breakdown"<br>3. Enter note: "Flat tire near Bocaue"<br>4. Submit | Marks vehicle as disabled. Notifies dispatch to reroute subsequent units. | P |
| `TC-COND-SAFE-180` | Log accident report | Collision or passenger injury | 1. Open Incidents<br>2. Select "Accident"<br>3. Submit with GPS location | Immediately flags shift as high emergency on admin monitoring. | P |

---

## Phase C8: Remittance, Reconcile & Shift Closeout

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-COND-REMIT-181` | View End of Day Remittance report | Shift active with recorded fares | 1. Open "End of Day" tab | Displays complete breakdown: Total Passengers, Cash In Hand (₱X), GCash Settled (₱Y), Free Ride Vouchers (Z), and Grand Total Revenue. | P |
| `TC-COND-REMIT-182` | Block remittance submission with unsynced offline fares | Offline fares remain in queue | 1. Attempt to submit remittance while offline or unsynced | Submission is blocked: "Some cash transactions are still waiting to sync. Reconnect to internet before submitting remittance." | P |
| `TC-COND-REMIT-183` | Submit End of Day remittance | All transactions synced online | 1. Tap "Submit Shift Report to Admin"<br>2. Confirm remittance submission | Shift closes permanently. Status transitions to `For Cash Declaration`. Displays Remittance Reference Number. | P |
| `TC-COND-REMIT-184` | Prevent fare collection after shift closeout | Shift has been remitted | 1. Attempt to open Fare Calculator | Blocked with message: "The shift has already ended; no new transactions can be recorded." | P |
| `TC-COND-REMIT-185` | View past remittance history | Conductor completed past shifts | 1. Open "Remittance History" | Lists past shift records with date, unit, gross cash, GCash, declaration status (`Complete`, `Shortage`, `Overage`). | P |
| `TC-COND-REMIT-186` | Admin declares matching cash (Exact) | Remittance submitted (₱500 expected cash) | 1. Admin inputs ₱500 cash in Admin Remittance Tracker | Shift status updates to `Complete`. Conductor history reflects "Exact / Balanced". | P |
| `TC-COND-REMIT-187` | Admin declares cash shortage | Expected ₱500, Admin counts ₱450 | 1. Admin inputs ₱450 | Status updates to `Shortage (₱50)`. Conductor history displays shortage note. | P |
| `TC-COND-REMIT-188` | Admin declares cash overage | Expected ₱500, Admin counts ₱520 | 1. Admin inputs ₱520 | Status updates to `Overage (₱20)`. Conductor history displays overage note. | P |
| `TC-COND-REMIT-189` | Automatic shift expiration past max shift hours | Max shift duration set to 12 hours | 1. Shift reaches 12 hours without conductor closeout | Backend cron auto-closes shift to prevent stale sessions. Marks shift as `Auto-Ended: For Cash Declaration`. | P |
| `TC-COND-REMIT-190` | Conductor logout after shift closeout | Shift is closed | 1. Open Settings<br>2. Tap "Log Out"<br>3. Confirm | Conductor session logs out cleanly. Terminal returns to Conductor Login screen. | P |

---

# SECTION 3: CROSS-APP INTEROPERABILITY & NATIVE RELIABILITY

## Phase X1: Cross-App & Web-Mobile Interoperability

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-INT-191` | Conductor QR to Commuter GCash Checkout end-to-end | Conductor on Unit J-04, Commuter on mobile | 1. Conductor generates GCash QR for ₱20<br>2. Commuter scans QR with mobile camera<br>3. Commuter pays via GCash | Conductor screen automatically flips to "PAID" via WebSocket/polling within 2 seconds. Commuter receives digital receipt. | P |
| `TC-INT-192` | Commuter Hail to Conductor Terminal end-to-end | Commuter within 800m of Unit J-04 | 1. Commuter taps "Hail Me"<br>2. Conductor hears alert and taps "Accept" | Commuter screen updates to "Conductor Accepted". Conductor map plots pickup marker. | P |
| `TC-INT-193` | Paper Receipt Claim to Voucher Unlock end-to-end | Commuter at 9 rides | 1. Conductor records cash fare and prints receipt<br>2. Commuter scans receipt QR in mobile app | Commuter cycle reaches 10/10. Voucher wallet unlocks free ride voucher immediately. | P |
| `TC-INT-194` | Commuter redeems Voucher on Conductor Terminal | Commuter holds voucher | 1. Commuter shows voucher QR<br>2. Conductor scans voucher | Conductor terminal records free ride. Commuter voucher moves to "Used Vouchers" in real time. | P |
| `TC-INT-195` | Admin modifies Fare Matrix on Web | Admin updates fare on web portal | 1. Admin changes base fare from ₱15 to ₱16 and publishes | Both Commuter and Conductor mobile apps fetch updated fare matrix on next calculation. | P |
| `TC-INT-196` | Admin publishes Route Detour on Web | Road construction advisory | 1. Admin publishes temporary route detour on web | Both mobile apps render the updated route geometry and detour advisory banner. | P |
| `TC-INT-197` | Admin publishes System Announcement | Emergency or promo notice | 1. Admin publishes announcement | Commuter mobile bottom nav badge updates immediately. Announcement appears in feed. | P |
| `TC-INT-198` | Lost & Found Claim workflow end-to-end | Conductor logs found umbrella | 1. Item posted in catalog<br>2. Commuter files claim with proof<br>3. Admin approves claim on web | Commuter app updates claim status to "Ready for Release" with pickup instructions. | P |
| `TC-INT-199` | Commuter Feedback reflects on Conductor metrics | Ride completed | 1. Commuter rates conductor 5 stars with "Polite" tag | Conductor's "Performance Metrics" screen updates average ratings and positive tag counts. | P |
| `TC-INT-200` | Conductor SOS reflects on Admin Live Monitoring | Conductor triggers SOS on phone | 1. Tap SOS on mobile conductor app | Admin web dashboard flashes red siren banner with vehicle unit plate, coordinates, and driver details. | P |
| `TC-INT-201` | Concurrent Web and Mobile Conductor sessions | Conductor opens web portal and mobile app | 1. Perform shift check on mobile<br>2. Open web portal on PC | Mobile operates shift; web acts as spectator or management without kicking mobile session. | P |
| `TC-INT-202` | Concurrent Web and Mobile Commuter sessions | Commuter signed in on PC and phone | 1. Check lost items on PC<br>2. Hail jeepney on phone | Neither session is dropped. Both receive account updates. | P |

---

## Phase X2: Mobile Hardware, Storage & Reliability

| Test Case ID | Test Case Description | Pre-conditions | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TC-SYS-203` | Camera permission denial and recovery | Fresh app install | 1. Deny camera permission<br>2. Tap "Pay with GCash"<br>3. Tap "Open Settings"<br>4. Enable camera permission in phone settings and return | Viewfinder initializes immediately upon returning to app without needing app restart. | P |
| `TC-SYS-204` | Camera flashlight / torch toggle | QR scanner open in dark environment | 1. Tap torch button in scanner | Device flashlight turns on to illuminate ticket/QR code. Tapping again turns torch off. | P |
| `TC-SYS-205` | Rapid barcode autofocus | Blurry receipt barcode | 1. Move camera closer/further from thermal receipt | Camera autofocuses rapidly (<500ms) and decodes token reliably. | P |
| `TC-SYS-206` | Background location tracking persistence | Conductor actively driving unit | 1. Send conductor app to background (switch to another app or home screen) for 15 minutes | Vehicle continues transmitting GPS points periodically. Admin map tracking remains continuous. | P |
| `TC-SYS-207` | GPS loss handling in tunnel or dead zone | Transit enters area with no GPS signal | 1. Simulate GPS loss / airplane GPS mode | App gracefully retains last known coordinate. Displays "GPS signal weak" banner without crashing. Resumes smoothly when signal returns. | P |
| `TC-SYS-208` | Complete offline storage integrity (AsyncStorage) | 5 cash fares stored offline | 1. Force kill the app while offline<br>2. Reopen the app while still offline | All 5 queued offline fares remain intact in local storage. Shift cash total accurately reflects the un-synced fares. | P |
| `TC-SYS-209` | Network drop during fare calculation | Commuter calculating fare | 1. Turn off WiFi / cellular data during stop selection | App uses locally cached Fare Matrix and route data. Displays fare calculation without network error. | P |
| `TC-SYS-210` | App killed and restored during active shift | Conductor has active shift | 1. Force kill `chatco-mobile`<br>2. Relaunch app | App reads stored session token and shift ID, re-hydrates dashboard and operating device status seamlessly. | P |
| `TC-SYS-211` | Deep-linking from GCash payment return | Commuter completed payment in external GCash app | 1. GCash app triggers return URL `chatco-commuter://gcash/return?status=paid` | App foregrounds automatically, parses return parameters, and renders Payment Success receipt screen. | P |
| `TC-SYS-212` | Memory leak and stability on long shift | Conductor app active for 8+ hours | 1. Operate app continuously across 100+ transactions | Metro memory consumption remains stable (<180MB RAM). No UI stutter or memory crashes. | P |
| `TC-SYS-213` | High-contrast dark theme outdoor readability | Device in bright sunlight | 1. Test app under direct sunlight | Dark theme (`#050F1A` background with `#62A0EA` and `#FF6D3A` high-contrast accents) provides clear legibility for drivers and conductors. | P |
| `TC-SYS-214` | Audio chime and haptic feedback toggle | Conductor Settings open | 1. Toggle "Scan Sound" off<br>2. Scan barcode | Barcode scans silently without audio beep, respecting user preference. | P |

---

## Known Observations & Implementation Notes

1. **CARTO API Key Failover (`TC-COMM-HAIL-020`):** Both mobile apps embed an automatic tile error handler on the Leaflet/WebView basemap layer. If the CARTO vector endpoint returns an HTTP 401 or rate-limit error, it silently falls back to OpenStreetMap tiles without interrupting user interaction.
2. **Double-Tap SOS Safety Window (`TC-COMM-SAFE-069`):** Emergency SOS on commuter mobile requires two taps within 1.5 seconds to prevent accidental emergency dispatch notifications while the device is in a commuter's pocket or bag.
3. **Offline Queue Sync Idempotency (`TC-COND-FARE-147`):** Offline cash transactions generated by conductors assign an ephemeral UUID on the device. When synced to the backend in batch, the backend checks for existing UUIDs to guarantee zero duplicate revenue records even if network disconnects mid-sync.
4. **Platform-Scoped Session Isolation (`TC-COMM-AUTH-017` & `TC-COND-AUTH-121`):** Mobile applications authenticate via `/api/v1/mobile/*` using Sanctum tokens carrying the `platform:mobile` ability, preventing the web session-dropping bug when a user accesses both web portal and mobile app concurrently.
