# Mahindra BE6 — Electric Fleet Atelier

Production web application built with React, Vite, Tailwind CSS, Firebase Authentication, and Cloud Firestore.

## Authentication & Security Features

- **Zero Demo Auto-Login**: Unauthenticated visitors and shared invite links always open signed out. Balances, transactions, recharge requests, and withdrawal requests are scoped strictly to the signed-in investor UID in Cloud Firestore.
- **No-OTP Email / Phone + Password Login & Registration**: Investors can sign in or register directly with either their **10-digit mobile number** or **email address**, plus a **password** and optional **referral code** (no OTP verification required).
- **Google Sign-In**: One-tap Google authentication is also supported alongside password sign-in.
- **Referral & Invite Links**: Sharing `/?invite=CODE` opens the Register form with the referral code pre-applied and persists it across login/registration.

---

## Required One-Time Firebase Console Setup

Before users sign in with **Email / Phone + Password** or from a **Hostinger custom domain**, verify these two settings in the Firebase Console (`modified-cab-nq7xb`):

1. **Enable Email/Password Provider**:
   - Open [Firebase Authentication Sign-in Methods](https://console.firebase.google.com/project/modified-cab-nq7xb/authentication/providers)
   - Click **Add new provider** -> **Email/Password** -> toggle **Enable** -> **Save**.
2. **Authorize Your Hostinger Domain**:
   - Open [Authentication Settings -> Authorized domains](https://console.firebase.google.com/project/modified-cab-nq7xb/authentication/settings)
   - Click **Add domain** and enter your live Hostinger domain (for example `yourdomain.com` and `www.yourdomain.com`) so Google Sign-In works on your custom domain.

---

## Option 1: Host Live Directly from AI Studio

You can deploy the app directly using AI Studio's Share / Deploy flow—no external server setup is needed, and Firebase Hosting/Auth rules are already configured.

---

## Option 2: Push to GitHub & Download Direct ZIP for Hostinger (`public_html`)

> **Important**: Shared web hosting on Hostinger (`public_html/`) serves **built static files** (`dist/index.html`, `dist/assets/*`, `dist/.htaccess`), **not** raw TypeScript/React source files (`src/*.tsx`). Uploading raw source files directly from GitHub's `Code -> Download ZIP` will not run in a browser.

Instead, use the included GitHub Actions workflow (`.github/workflows/hostinger-zip.yml`) or build locally:

### A. Push this code to your GitHub repo (`amangoyallll/BE6`)

From your local terminal inside the exported project folder:

```bash
git init
git add .
git commit -m "Secure Firebase Auth, Email/Phone+Password login, Hostinger build setup"
git branch -M main
git remote add origin https://github.com/amangoyallll/BE6.git
git push -u origin main
```

### B. Download the Ready-to-Upload ZIP from GitHub & Upload to Hostinger

1. Once pushed, GitHub Actions automatically runs **Build Hostinger Ready ZIP** and publishes **`hostinger-public-html.zip`** under **Releases -> `hostinger-latest`** (and under **Actions -> workflow artifacts**).
2. Download `hostinger-public-html.zip`.
3. Open **Hostinger hPanel -> Files -> File Manager -> `public_html/`**.
4. Upload `hostinger-public-html.zip` into `public_html/` and click **Extract** (make sure `index.html`, `.htaccess`, `assets/`, and `src/assets/` sit directly inside `public_html/`, not inside a nested subfolder).
5. Open your Hostinger domain—your live site and `?invite=` links work immediately.

### C. Or Build the Hostinger ZIP Locally

```bash
npm install
npm run build
```

Zip the **contents** of `dist/` (including the hidden `.htaccess` file) and extract them into Hostinger's `public_html/`.
