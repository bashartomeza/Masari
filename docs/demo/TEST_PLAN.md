# Masari test plan (Admin site + Android app)

Everything runs on a disposable demo database. Nothing here touches real data, a real SMS provider or the checkpoint provider.

**How to report back:** for each ID write `PASS`, `FAIL` or `SKIP`, and for a FAIL one line saying what you saw (a screenshot helps). Sending only the failures is fine, as long as you say the rest passed.

## 0. Setup

| What | Where |
| --- | --- |
| Admin site | http://localhost:5173 |
| API | http://localhost:3000 (the emulator reaches it as http://10.0.2.2:3000) |
| Admin sign-in | email `demo.admin@masari.app`, password `DEMO_ADMIN_PASSWORD` from `apps/api/.env` |
| Demo app sign-ins (email + password from `apps/api/.env`) | passenger `demo.passenger@masari.app`, driver `demo.driver@masari.app` (and `demo.driver2@masari.app`), merchant `demo.merchant@masari.app` — passwords are `DEMO_PASSENGER_PASSWORD`, `DEMO_DRIVER_PASSWORD`, `DEMO_MERCHANT_PASSWORD` |
| Sign-up invitation codes | `.staging-data/test-env/invitations.txt` (passenger +970590002001, driver +970590002002, merchant +970590002003) |
| Email verification code (normal user sign-up) | the newest line for that email in `.staging-data/test-env/email-codes.txt` (no real email is sent; type the six-digit code into the app) |
| One-time SMS codes | the newest line of `.staging-data/test-env/otp.txt` (there is no real SMS; the code is written to that file) |
| Sample files on the emulator (Downloads) | `licence.jpg` (valid), `vehicle-registration.pdf` (valid), `not-really-an-image.jpg` (text pretending to be a photo) |
| Pending / rejected demo accounts | Demo Pending Merchant, Demo Pending Driver, Demo Rejected Driver (already seeded) |

**Maps need internet.** They load tiles from OpenStreetMap. If a map on the phone is a grey box, the emulator has lost its internet: close it and start it again with `emulator -avd Medium_Phone_API_36.0 -no-snapshot-load -dns-server 8.8.8.8,1.1.1.1`.

Start everything: `pwsh -NoProfile -File scripts/test-env/start.ps1`. Stop: `scripts/test-env/stop.ps1`. Back to a clean starting state at any time: `scripts/test-env/reset-data.ps1` (it makes new invitation codes; the sign-up and approval tests use things up, so reset before repeating them).

## A. Admin site

| ID | Do | Expect |
| --- | --- | --- |
| A01 | Open the site, sign in as the Admin | Overview opens; your name shows in the header |
| A02 | Sign in with a wrong password | A clear error; you stay on the sign-in screen |
| A03 | Switch Arabic ⇄ English | Whole page flips language and direction (right-to-left in Arabic); nothing overlaps or is cut off |
| A04 | Open every item in the left menu, one by one | Each page opens without a crash. Pages that are not built say so plainly (no fake numbers) |
| A05 | Overview cards | Active drivers, Pending approvals (1 right after a reset: the pending demo driver) and Incidents show numbers, not errors |
| A06 | Users: search by name, filter by role and status | Lists narrow correctly; the pending/rejected demo accounts are findable |
| A07 | Users: open a user | Detail shows role, status and no passwords or tokens |
| A08 | Users: suspend a demo passenger with a reason, then reactivate | Status changes and shows in the list; the reason is required for suspend |
| A09 | Merchant approval: Users → filter Pending → Demo Pending Merchant → Approve | Account becomes active. (Then sign that merchant in on the phone: it works) |
| A10 | Reject a different pending merchant (use reset first if none left) with no reason, then with a reason | Without a reason it refuses; with one the account is disabled |
| A11 | Drivers & verification → Pending → Demo Pending Driver | Review panel opens with profile, vehicle section and a decision area |
| A12 | In that review, record evidence: choose "Driver licence", add a short note, Record sighting | It appears in the list with your name and time; the status text changes from "not collected" |
| A13 | Approve the pending driver (enter a vehicle type, seats, parcel capacity) | Status Approved; history shows the decision |
| A14 | Drivers → Rejected → Demo Rejected Driver → Reopen for review (give a reason) | It returns to Pending; history keeps the earlier rejection and shows "Reopened" |
| A15 | Reject a pending driver without a reason | It refuses; with a reason it works |
| A16 | Incidents (after a phone report, see E07) | The report is listed as New; Start review with a note, then Mark resolved; Resolved cannot be changed back |
| A17 | Reports page: change dates, download all three CSV files | Numbers match the lists; files open (Arabic text readable in Excel) |
| A18 | Matching, Shipments & batching, Trips & tracking, Comparison pages | They show the seeded demo data (the combined passenger+parcel trip, the 1-trip-vs-6 comparison) without errors |
| A19 | Sign out, then press the browser Back button | You are not let back into the Admin pages |

## B. Phone: signing in

| ID | Do | Expect |
| --- | --- | --- |
| B01 | Open the app | Sign-in screen, Arabic by default, right-to-left |
| B02 | Switch to English with the globe icon | Everything flips to English, left-to-right; switch back works |
| B03 | Wrong email/password | A clear "incorrect" message, not a crash or a network error |
| B04 | Sign in as the demo passenger | Passenger home opens |
| B05 | Sign out, sign in as the demo driver, then the demo merchant | Each role sees its own home and tabs, and none of the other roles' screens |
| B06 | Close the app completely and reopen it | You are still signed in (or sent to sign-in, but never to a broken screen) |
| B07 | Turn the emulator's internet off (airplane mode) and open a list | A friendly offline/error message with a retry; no crash |

## C. Phone: creating an account (with an invitation, or openly as a driver or shop owner)

Use the codes in `invitations.txt`. After each sign-up, read the code from `otp.txt`.

| ID | Do | Expect |
| --- | --- | --- |
| C01 | Sign-in screen → "New to Masari? Create an account" | A screen asks "How will you use Masari?" with three choices: Normal user, Driver, Shop owner. Normal user opens the email sign-up form; Driver and Shop owner open the invitation-code and phone screen with the role already chosen; Back returns to sign-in |
| C02 | Enter a wrong code | A clear error; you can try again |
| C03 | Choose Shop owner (invitation code and +970590002003), enter the right code (from `otp.txt`), then name, a password of at least 15 characters, tick the three consents, Create account | Account created; the screen says the account is pending and an admin review usually takes up to 24 hours |
| C04 | Repeat for the driver (+970590002002) | The screen says "Application under review" and shows a "Verification documents" card |
| C05 | Driver: Add a document → choose `licence.jpg` (type "Driving licence") | It appears in the list as "Driving licence · 1 KB" |
| C06 | Add `vehicle-registration.pdf` with type "Vehicle registration" | It appears in the list |
| C07 | Add `not-really-an-image.jpg` | Refused with "Only JPEG, PNG or PDF files can be uploaded"; nothing added |
| C08 | Tap the bin on one document | It disappears from the list |
| C09 | Try to add more than 6 documents | After 6 the Add button is disabled or a limit message shows |
| C10 | In the Admin site, open that driver's review | The uploaded documents are listed with a Download button; the downloaded file opens and is the right file |
| C11 | Try to sign in on the phone as the new (pending) driver | You are not let in (account pending), with a clear message |
| C12 | Admin approves that driver (A13), then press Refresh in the app's pending screen | It now says approved and offers sign-in; sign-in works |
| C13 | Admin approves the shop owner from C03 (A09), then sign in on the phone with their phone number and password | Same pending → approved path; the merchant home opens |
| C14 | Use an invitation code twice, or a code with the wrong phone | Refused without revealing why |
| C15 | Sign-in screen → "Check an existing application" with a pending applicant's phone and password | Shows the application status |
| C16 | Shop owner (pending, from C03): Add a document → choose `licence.jpg` (type "Commercial register") | The pending screen shows "Verification documents" asking for the commercial register, national ID and shop photo; the file appears in the list as "Commercial register · 1 KB" |
| C17 | In the Admin site, Users → the pending shop owner → Approve (or Reject) | The shop owner's documents are listed with a Download button before you decide; the downloaded file opens and is the right file |
| C18 | Create account → Normal user → name, an email ending in @example.com, a password of at least 12 characters → Sign up; type the six-digit code from `email-codes.txt`, tick the three documents, Continue; then enter a phone such as +970590003020, Send code, type the code from `otp.txt`, Continue | The passenger home opens; no invitation code and no admin approval were needed |
| C19 | Open registration (the local test environment turns it on). Create account → Driver. Leave the invitation code empty (it says "Invitation code (optional)"), enter a new phone such as +970590004001, Send code, type the code from `otp.txt` | The code screen opens without any invitation code |
| C20 | Enter a wrong code, then the right one; then name, a password of at least 15 characters, tick the three consents, Create account | Account created; the screen says "Upload your documents" (not "Application under review"); the button "Send for review" is disabled and lists what is still needed |
| C21 | Add `licence.jpg` (Driving licence) and `vehicle-registration.pdf` (Vehicle registration) only | "Send for review" stays disabled; "Still needed" names the national ID |
| C22 | In the Admin site, look in Users and the driver approvals queue for that driver | The driver is not in the review queue yet; approving or rejecting is refused (not submitted) |
| C23 | Add a National ID document, then press "Send for review" | The screen changes to "Application under review" and says review usually takes up to 24 hours |
| C24 | In the Admin site open the driver approvals queue | The driver is listed; the three documents have Download buttons and open correctly; Approve works; the phone then signs in |
| C25 | Create account → Shop owner with no invitation code (+970590004002); upload commercial register and national ID only | "Send for review" stays disabled until the shop photo is added; then it submits and the shop owner appears in Users as a pending merchant that can be approved |
| C26 | Open registration, start with a phone number that already has an account, type the code from `otp.txt`, then fill the form | The first screens look exactly like a new number; only at Create account does it say the registration could not be completed |
| C27 | Start sign-up again with the same phone number twice, then use the first code | The older attempt no longer works; only the newest code and screen continue |
| C28 | Request a code for the same phone more than 5 times in a day, or start more than 10 sign-ups from the one phone in an hour | The app shows a "too many attempts" message; no further codes are produced in `otp.txt` |
| C29 | Sign-in screen → "Check an existing application" for the C20 driver before documents are sent | It shows "Upload your documents", not "under review" |
| C30 | Invitation codes still work: repeat C03 or C04 with a code from `invitations.txt` | Created as before; the application is under review at once (no extra "Send for review" step) |

## D. The main story (passenger + merchant + driver)

Run after a reset so the seeded data is fresh. Use the demo accounts.

| ID | Do | Expect |
| --- | --- | --- |
| D01 | Passenger: open the seeded request and its match | The request and a match result are shown |
| D02 | Merchant: open the seeded order | Five parcels and their batch are shown |
| D03 | Admin: open the Matching page; if there is no match yet, run matching | One combined passenger+parcel match exists, with a score breakdown |
| D04 | Driver (the selected one): open the inbox | The match is there; the other driver's inbox is empty |
| D05 | Driver: accept the match | Exactly one trip is created |
| D06 | Driver: advance pickup → picked up → in transit (and simulate points) | Only the next valid action is offered each time |
| D07 | Passenger and merchant: open their trip | Both see the same trip and the same latest location; read-only |
| D08 | Passenger and merchant: bell and Notifications tab | A "match accepted" and "trip update" entries; tapping one clears its dot; "Mark all as read" works |
| D09 | Driver: complete the trip | Trip shows completed on all three phones and in the Admin |
| D10 | Tracking wording | Anywhere location appears it is described as simulated, never as live GPS |

## E. Smaller features

| ID | Do | Expect |
| --- | --- | --- |
| E01 | Driver: Earnings/performance tab | Completed-trip counts shown; earnings says it is not tracked (no invented amount) |
| E02 | Same tab, acceptance rate | Under 5 answered offers it says the rate appears after 5; after accepting/rejecting 5 offers it shows a percentage and "x of y" |
| E03 | Driver: reject an offer and accept another (needs fresh offers: reset) | The numbers in E02 move accordingly |
| E04 | Merchant: Reports tab | Orders, parcels and deliveries by status; matches the Admin report for that merchant |
| E05 | Passenger on a trip: Report a problem → Delay → write a sentence → Send | Confirmation; the sheet says it is not an emergency service |
| E06 | Send 11 reports without any being resolved | The 11th is refused with a message about too many open reports |
| E07 | Admin: Incidents | The report from E05 is there (see A16); after you resolve it, the passenger gets two new notifications and does not see your internal note |
| E08 | Driver: go online/offline | The state changes once per tap and survives closing the app |

## F. Things that must NOT work (safety checks)

| ID | Do | Expect |
| --- | --- | --- |
| F01 | Admin site: sign in as a passenger (using a passenger's email and password) | Refused |
| F02 | A pending merchant or driver signs in on the phone | Refused with a clear message |
| F03 | After the Admin rejects a driver with a reason, sign in as that driver | Refused |
| F04 | As a passenger, try to open driver or merchant screens (via the menu only; no URL tricks) | Not reachable |
| F05 | Admin downloads a driver document, then the applicant is approved: can the applicant still upload? | No: uploading is closed once a decision is made |
| F06 | Look through every screen for the words "push notification", "emergency", "live GPS", "payment", "earnings" used as if they work | None claim a feature that is not built |
| F07 | With the open-registration switch off (`OPEN_DRIVER_MERCHANT_SIGNUP_ENABLED=false`, the default everywhere except the local test environment), choose Driver and leave the invitation code empty | The code field is required; sending without one is refused and no code is produced |
| F08 | Call `POST /api/v1/onboarding/application/submit` with a pending driver or shop owner session that is missing a required document (any HTTP client) | 409 `documents_required`, listing what is missing; the application is not submitted |
| F09 | Passenger role without an invitation code, even with the switch on | Refused; passengers always register by email or Google |
| F10 | A submitted driver deletes the only file of a required kind | Refused (documents_required); replacing it by adding a second file first works |

## G. Not in scope (do not report these as bugs)

Real SMS delivery (codes come from `otp.txt`), push notifications, payments, fares and earnings amounts, live tracking, PDF or Excel exports, maps and the checkpoint feeds (switched off), and anything on a real server (hosting is not set up yet).

## Results

| ID | PASS / FAIL / SKIP | What you saw (for FAIL) |
| --- | --- | --- |
| | | |
