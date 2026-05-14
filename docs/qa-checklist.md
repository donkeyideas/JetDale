# Jetdale QA Checklist

**Last updated:** 2026-05-12

Use this checklist before every release. Each section lists the feature, the specific test steps, and the expected result. Mark items as they are verified.

---

## 1. Authentication Flows

### Signup

- [ ] **Email signup** — Enter email + password -> receive confirmation email -> click link -> land on onboarding screen
- [ ] **Apple Sign-In** — Tap "Continue with Apple" -> complete Apple flow -> land on onboarding screen (iOS only)
- [ ] **Google Sign-In** — Tap "Continue with Google" -> complete Google flow -> land on onboarding screen
- [ ] **Duplicate email** — Attempt signup with an existing email -> show clear error message, do not create duplicate account
- [ ] **Weak password** — Attempt signup with a short/weak password -> show validation error before submission

### Signin

- [ ] **Email signin** — Enter valid credentials -> land on projects screen
- [ ] **Apple Sign-In** — Tap "Continue with Apple" -> authenticate -> land on projects screen
- [ ] **Google Sign-In** — Tap "Continue with Google" -> authenticate -> land on projects screen
- [ ] **Wrong password** — Enter incorrect password -> show error, do not reveal whether email exists
- [ ] **Unverified email** — Attempt signin with unverified email -> show appropriate message

### Signout

- [ ] **Signout** — Tap signout -> clear session -> redirect to signin screen
- [ ] **Session cleared** — After signout, navigate back -> should not show authenticated content

### Forgot Password

- [ ] **Request reset** — Enter email -> receive reset email -> click link -> set new password -> signin with new password
- [ ] **Invalid email** — Enter non-existent email -> show generic success message (do not reveal whether email exists)

---

## 2. Discovery Flow

### Start Project

- [ ] **Create project** — Tap "New Project" -> enter project name -> project created and appears in list
- [ ] **Project limit (free tier)** — Free user with max projects tries to create another -> show paywall

### Archetype Detection

- [ ] **Auto-detect** — Answer the initial pitch question -> system suggests correct archetype
- [ ] **Confirm archetype** — User confirms the suggested archetype -> continue to archetype-specific questions
- [ ] **Switch archetype** — User rejects the suggestion -> offer archetype selection -> switch to the chosen script

### Question Navigation

- [ ] **Forward navigation** — Answer a question -> advance to the next question
- [ ] **Back navigation** — Tap back -> return to the previous question with the answer preserved
- [ ] **Progress indicator** — Progress bar or step counter updates correctly as questions are answered
- [ ] **Required vs optional** — Skip an optional question -> allowed. Skip a required question -> blocked with validation message
- [ ] **Branching logic** — When a question has branching, the correct next question appears based on the answer

### Voice Input

- [ ] **Start recording** — Tap microphone icon -> recording indicator appears
- [ ] **Stop recording** — Tap stop -> audio is transcribed and inserted into the answer field
- [ ] **Permission denied** — Deny microphone permission -> show helpful error, do not crash
- [ ] **Voice limit (free tier)** — Free user exceeds voice minutes -> show paywall or disable voice button

### Completion

- [ ] **All questions answered** — Complete all required questions -> discovery marked as "completed"
- [ ] **Summary generated** — After completion, a discovery summary is generated and displayed
- [ ] **Abandon flow** — Navigate away mid-discovery -> progress is saved. Return later -> resume from where you left off

---

## 3. Artifacts

### Generation

- [ ] **Auto-generate after discovery** — After discovery completes, artifacts begin generating in the correct order
- [ ] **Generation status** — Each artifact shows a loading/generating state while in progress
- [ ] **Generation complete** — Artifact transitions to "ready" state and content is displayed
- [ ] **Generation failure** — If generation fails, show error state with retry option

### Viewing

- [ ] **View artifact** — Tap an artifact -> full content displayed with proper formatting (markdown rendering)
- [ ] **Navigate between artifacts** — Switch between different artifact types (vision, scope, roadmap, etc.)

### Regeneration

- [ ] **Regenerate single artifact** — Tap regenerate -> artifact enters generating state -> new content appears
- [ ] **Version preserved** — Previous version is saved and accessible in version history

### Version History

- [ ] **View history** — Open version history -> see all previous versions with timestamps
- [ ] **Restore version** — Select a previous version -> confirm restore -> content reverts to that version

---

## 4. Reality Check

### Run Check

- [ ] **Trigger reality check** — Tap "Run Reality Check" -> loading state -> results displayed
- [ ] **Concerns displayed** — Each concern shows severity (critical/high/medium/low), area, message, and suggested action
- [ ] **Proposed changes** — Proposed changes list the affected artifact and change description
- [ ] **Reality check limit (free tier)** — Free user exceeds monthly checks -> show paywall

### Accept / Reject Changes

- [ ] **Accept change** — Accept a proposed change -> affected artifact is updated
- [ ] **Reject change** — Reject a proposed change -> no artifact changes, concern is dismissed
- [ ] **Partial accept** — Accept some changes and reject others -> only accepted changes apply

---

## 5. Workspace Chat

### Send Message

- [ ] **Send text message** — Type a message and send -> message appears in chat history
- [ ] **Empty message blocked** — Attempt to send empty message -> send button disabled or blocked

### Streaming Response

- [ ] **AI response streams** — After sending a message, the AI response streams in token by token (not all at once)
- [ ] **Response references artifacts** — When the AI references an artifact, it is linked/highlighted

### History

- [ ] **Chat persists** — Leave the chat and return -> previous messages are still visible
- [ ] **Chat limit (free tier)** — Free user exceeds daily message limit -> show paywall or limit message

---

## 6. Export

### All 9 Export Formats

Test each export target:

- [ ] **Claude Code** — Generate export -> download zip -> contains properly formatted prompt files
- [ ] **Cursor** — Generate export -> download zip -> contains .cursor-compatible project structure
- [ ] **Lovable** — Generate export -> download zip -> contains Lovable-compatible files
- [ ] **Bolt** — Generate export -> download zip -> contains Bolt-compatible files
- [ ] **Replit** — Generate export -> download zip -> contains Replit-compatible files
- [ ] **ZIP / Markdown** — Generate export -> download zip -> contains all artifacts as .md files
- [ ] **PDF** — Generate export -> download PDF -> all artifacts rendered with proper formatting
- [ ] **Pitch Deck** — Generate export -> download -> contains slide-formatted content
- [ ] **RFP** — Generate export -> download -> contains formal RFP document

### Download and Share

- [ ] **Download works** — Tap download -> file saves to device / triggers browser download
- [ ] **Export limit (free tier)** — Free user exceeds monthly export limit -> show paywall
- [ ] **Export target restriction (free tier)** — Free user can only access zip_markdown -> other targets show paywall

---

## 7. Payments

### Paywall Display

- [ ] **Paywall appears at limit** — When a free-tier limit is hit, the paywall screen appears
- [ ] **Plan comparison** — Paywall shows feature comparison between free and pro tiers
- [ ] **Pricing displayed** — Monthly and annual pricing shown correctly ($49/mo, $390/yr for pro)

### RevenueCat Purchase (Mobile — Sandbox)

- [ ] **iOS purchase flow** — Tap subscribe -> Apple payment sheet appears -> complete sandbox purchase -> plan upgrades to pro
- [ ] **Android purchase flow** — Tap subscribe -> Google Play payment sheet appears -> complete test purchase -> plan upgrades to pro
- [ ] **Restore purchases** — Tap "Restore Purchases" -> previously purchased subscription is restored
- [ ] **Subscription status syncs** — After purchase, the app immediately reflects the new plan tier

### Stripe Checkout (Web — Test Mode)

- [ ] **Checkout redirect** — Click subscribe -> redirect to Stripe Checkout with correct price
- [ ] **Test card payment** — Use test card (4242 4242 4242 4242) -> payment succeeds -> redirect back to app
- [ ] **Declined card** — Use decline test card (4000 0000 0000 0002) -> show error, do not upgrade
- [ ] **Webhook processes** — After Stripe checkout, the webhook fires and updates the subscription in the database

### Webhook Processing

- [ ] **Subscription created** — Webhook `INITIAL_PURCHASE` -> subscription row created with correct plan_tier and status
- [ ] **Subscription renewed** — Webhook `RENEWAL` -> subscription status stays active, period dates updated
- [ ] **Subscription canceled** — Webhook `CANCELLATION` -> subscription status updated to canceled
- [ ] **Subscription expired** — Webhook `EXPIRATION` -> subscription status updated to expired, user reverts to free tier

---

## 8. Admin Dashboard

### Dashboard Loads

- [ ] **Dashboard accessible** — Navigate to admin URL -> dashboard loads without errors
- [ ] **Auth required** — Non-admin users are redirected or see a 403 page
- [ ] **Admin role required** — Only users with `admin` or `support` role can access

### KPIs Display

- [ ] **Total users** — Displayed and matches database count
- [ ] **Active subscribers** — Displayed and matches subscriptions with status = active
- [ ] **MRR** — Monthly recurring revenue calculated and displayed correctly
- [ ] **Projects created (last 30 days)** — Count displayed and plausible
- [ ] **Discovery completion rate** — Percentage displayed and plausible

### User Table

- [ ] **User list loads** — Table displays with columns: email, plan, status, created date, last active
- [ ] **Pagination** — Navigate between pages of users
- [ ] **Search** — Search by email -> correct results returned

### Filters

- [ ] **Filter by plan tier** — Select "pro" -> only pro users shown
- [ ] **Filter by status** — Select "active" -> only active subscriptions shown
- [ ] **Filter by date range** — Select date range -> users created in that range shown
- [ ] **Filters combine** — Apply multiple filters -> intersection of results shown

---

## 9. Marketing Site

### Landing Page

- [ ] **Page loads** — Landing page renders without errors or missing assets
- [ ] **Hero section** — Headline, subheadline, and CTA button visible
- [ ] **Feature sections** — All feature descriptions and illustrations load
- [ ] **CTA links** — "Get Started" and "Try Free" buttons link to signup

### Pricing Page

- [ ] **Pricing page loads** — All plan tiers displayed with correct pricing
- [ ] **Feature comparison table** — All features listed with correct check marks per tier
- [ ] **Monthly/annual toggle** — Toggle switches prices between monthly and annual
- [ ] **CTA buttons** — Each plan's CTA links to the correct signup/checkout flow

### Responsive Design

- [ ] **Mobile (375px)** — Layout adapts, text is readable, buttons are tappable, no horizontal scroll
- [ ] **Tablet (768px)** — Layout adapts to medium screens
- [ ] **Desktop (1280px+)** — Full layout renders correctly
- [ ] **Navigation** — Mobile hamburger menu opens/closes, all links work

---

## 10. Cross-Platform

### iOS

- [ ] **App launches** — App opens without crash on a physical iOS device or simulator
- [ ] **All core flows work** — Discovery, artifacts, chat, export, payments
- [ ] **Push notifications** — Receive and tap a notification -> navigates to correct screen
- [ ] **Deep links** — Open a Jetdale deep link -> app opens to the correct screen

### Android

- [ ] **App launches** — App opens without crash on a physical Android device or emulator
- [ ] **All core flows work** — Discovery, artifacts, chat, export, payments
- [ ] **Push notifications** — Receive and tap a notification -> navigates to correct screen
- [ ] **Back button** — Hardware back button navigates correctly, does not exit app unexpectedly

### Web (Mobile Browser)

- [ ] **Safari iOS** — App loads and core flows work in Safari on iPhone
- [ ] **Chrome Android** — App loads and core flows work in Chrome on Android
- [ ] **Chrome Desktop** — App loads and core flows work in Chrome on desktop
- [ ] **Firefox Desktop** — App loads and core flows work in Firefox on desktop

---

## 11. Accessibility

### Screen Reader

- [ ] **Labels present** — All interactive elements have accessible labels (buttons, inputs, links)
- [ ] **Navigation order** — Tab order follows visual layout logically
- [ ] **Live regions** — Loading states and dynamic content updates are announced

### Contrast

- [ ] **Text contrast** — Body text meets WCAG AA (4.5:1 ratio)
- [ ] **Button contrast** — Interactive elements meet WCAG AA (3:1 ratio for large text, 4.5:1 for normal)
- [ ] **Error states** — Error messages are not conveyed by color alone (include icon or text)

### Keyboard Navigation

- [ ] **Tab through forms** — All form fields reachable via Tab key
- [ ] **Enter to submit** — Forms submit with Enter key
- [ ] **Escape to close** — Modals and dropdowns close with Escape key
- [ ] **Focus visible** — Focus ring visible on all interactive elements

---

## 12. Performance

### Page Load Time

- [ ] **Landing page** — First Contentful Paint < 1.5s on 4G connection
- [ ] **App initial load** — Time to Interactive < 3s on 4G connection
- [ ] **Admin dashboard** — Dashboard loads within 3s

### AI Response Time

- [ ] **Discovery follow-up** — AI response begins streaming within 3s
- [ ] **Artifact generation** — First artifact begins generating within 5s of triggering
- [ ] **Reality check** — Results appear within 10s
- [ ] **Chat response** — First token appears within 2s

### App Startup (Mobile)

- [ ] **Cold start (iOS)** — App is interactive within 3s of tap
- [ ] **Cold start (Android)** — App is interactive within 4s of tap
- [ ] **Warm resume** — App resumes from background within 1s
