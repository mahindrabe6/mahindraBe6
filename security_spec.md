# Mahindra BE6 — Firestore Security Specification

## 1. Data Invariants

1. **Authentication & Role Isolation**: Every read and write requires `request.auth != null`. Investor accounts created via Email/Phone + Password operate under strict `isOwner(uid)` isolation. The bootstrapped owner email (`techbcofficialaman@gmail.com`) and explicitly provisioned entries in `/admins/{uid}` (writable only by an existing Admin) hold `isAdmin()` access across both Google and Email + Password sessions.
2. **PII Isolation**: User documents (`/users/{uid}`), subcollections (`activePlans`, `transactions`), `rechargeRequests`, and `withdrawalRequests` are strictly readable only by the owning user (`request.auth.uid == uid`) or an Admin (`techbcofficialaman@gmail.com` or `/admins/{uid}`). No user can list `/users` or read another user's phone, email, or bank details.
3. **Self-Registration Integrity**: On creating `/users/{uid}`, `uid` must equal `request.auth.uid`, `accountStatus` must be `'active'`, `balance` must strictly equal the configured `signupBonusAmount` (₹40 default), and `createdAt`/`updatedAt` must equal `request.time`.
4. **Atomic Plan Purchase**: Creating `/users/{uid}/activePlans/{id}` requires `getAfter(/users/{uid}).balance == get(/users/{uid}).balance - investmentAmount` and `daysClaimed == 0`.
5. **Action-Based Updates & Terminal State Locking**: Investors can only update specific allowlisted fields on `/users/{uid}` (`darkMode`, `bankDetails`, `lastLoginAt`, bounded `balance` / `lastCheckInDate`). `rechargeRequests` and `withdrawalRequests` can only be created with `status == 'pending'`, and only Admins can transition status to `'approved'` or `'rejected'`.
6. **Referral Code Anti-Scraping**: `/referralCodes/{code}` allows exact `get` only (no `list`), contains no PII (`code`, `ownerUid`, `createdAt`), and `/referrals/{id}` allows `list` only when `resource.data.referrerUid == request.auth.uid || resource.data.referredUid == request.auth.uid || isAdmin()`.

## 2. Adversarial Payloads (Must All Return `PERMISSION_DENIED`)

1. **Unauthenticated read** on `/users/uid123` (`request.auth == null`).
2. **Non-admin email spoofing admin action** (`email == 'attacker@example.com'` attempting to write `/admins/{uid}` or read `/users`).
3. **Cross-user profile read** (`uidA` attempting `get /users/uidB`).
4. **Blanket user list scrape** (`uidA` non-admin attempting `list /users`).
5. **Self-inflated signup bonus** (`create /users/uidA` with `balance: 999999`).
6. **Shadow field / privilege escalation** (`update /users/uidA` injecting `isAdmin: true` or `role: 'admin'`).
7. **Self-activating suspended account** (`update /users/uidA` changing `accountStatus: 'active'` when suspended).
8. **Self-crediting arbitrary balance** (`update /users/uidA` with `balance: 50000` without check-in/yield limits).
9. **Free plan creation without deducting balance** (`create /users/uidA/activePlans/p1` without matching atomic balance deduction in `/users/uidA`).
10. **Self-approving recharge request** (`create /rechargeRequests/r1` with `status: 'approved'` or `update` by non-admin).
11. **Querying another user's withdrawal requests** (`list /withdrawalRequests` without `where('uid', '==', auth.uid)`).
12. **Client-spoofed timestamp / oversized ID** (`create /users/uidA` with client-forged `createdAt` != `request.time` or 500-char doc ID).
