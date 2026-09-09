<div align="center">

# 📱 BunkCalc

### _Take Control of Your College Life._

[![Version](https://img.shields.io/badge/version-2.2.1-blue?style=for-the-badge)](https://github.com/PinecoXZ/BunkCalc_App)
[![Version](https://img.shields.io/badge/version-2.2.2-blue?style=for-the-badge)](https://github.com/PinecoXZ/BunkCalc_App)
[![Platform](https://img.shields.io/badge/platform-Android-3ddc84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/PinecoXZ/BunkCalc_App)
[![License](https://img.shields.io/badge/license-Private-red?style=for-the-badge)](https://github.com/PinecoXZ/BunkCalc_App)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119eff?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com)

The **ultimate proactive attendance tracker** built for university students.  
Biometric fingerprint lock. 1-tap quick actions. 10 modular settings hubs. Class timetable QR sharing. Zero data collection.

---

</div>

## ✨ Features

| Feature | Description |
|---|---|
| ⚡ **1-Tap Attendance & Batch Action** | Direct 1-tap `[Present]` / `[Absent]` marking on cards plus a "Mark All Present" batch action with daily progress bar |
| 🔍 **Subject Filter Chips & 4-Way Sort** | Instant search by room or faculty, filter chips (`All`, `In Danger`, `Safe`, `Labs`), and 4-way sorting |
| ⚡ **Timetable Cloud & QR Sharing** | Share and import full section timetables in 1 second with 6-letter short codes or camera QR scanning |
| 📥 **Mid-Semester Past Attendance** | Enter past attended and missed class numbers during timetable import or edit them anytime in Subject Details |
| ✏️ **Interactive Holiday Manager** | Add and manage semester breaks directly with automated reminder rescheduling and calendar sync |
| 🎯 **Weekly Bunk Strategy** | Smart 7-day tactical roadmap showing safe skips and exact consecutive classes needed for recovery |
| 📊 **Weekly Attendance Trends** | 8-week visual bar chart tracking your weekly attendance percentage against your threshold |
| ⏳ **Semester Progress Bar** | Real-time timeline bar tracking weeks remaining in the semester and elapsed class days |
| 📂 **CSV & PDF Exports** | Download your complete attendance records as CSV spreadsheets or export formatted PDF reports |
| 🔍 **History Search & Filters** | Filter attendance logs by subject, status (Present/Absent/Cancelled), or custom date range |
| 🛡️ **Delete Safety Confirmations** | Built-in confirmation dialogs prevent accidental deletion of attendance records or subject profiles |
| 🔔 **Smart Local Notifications** | Post-class attendance prompts with 10-minute delayed dispatch and automated duplicate suppression |
| 📅 **Today View** | See your daily schedule at a glance with interactive swipe-marking |
| 📈 **Statistics Dashboard** | Rich analytics with per-subject and overall attendance percentages |
| 🗂️ **Semester Archives** | Automatically archive past semesters and browse your academic history |
| 📴 **Fully Offline** | All data stored locally on-device — no internet, no servers, no tracking |
| 📤 **Import / Export** | Backup and restore your data via validated JSON files |
| 🔐 **Security Hardened** | Strict CSP, input sanitisation, schema validation, prototype pollution prevention |

---

## 🏗️ Tech Stack

```
Frontend       React 19 + TypeScript 6
Styling        Tailwind CSS 4
State          Zustand 5
Build          Vite 8
Native Shell   Capacitor 8 (Android)
Biometrics     @aparajita/capacitor-biometric-auth
Haptics        @capacitor/haptics
Notifications  @capacitor/local-notifications
Storage        @capacitor/preferences (encrypted key-value)
File I/O       @capacitor/filesystem
Share          @capacitor/share
```

---

## 📂 Project Structure

```
BunkCalc1/
├── android/                  # Native Android project (Capacitor-managed)
│   └── app/
│       ├── build.gradle      # Android build config (versionCode 8, v2.2.1)
│       ├── build.gradle      # Android build config (versionCode 9, v2.2.2)
│       └── src/main/
│           ├── assets/       # Synced web bundle + public assets
│           └── res/          # Launcher icons (mdpi → xxxhdpi) + splash
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── AppLockModal.tsx     # Biometric / PIN App Lock
│   │   ├── PinSetupModal.tsx    # 4-Digit Tactile PIN Keypad
│   │   ├── WeeklyStrategyModal.tsx # 7-day recovery roadmap
│   │   ├── WhatIfSimulator.tsx  # Bunk prediction simulator
│   │   ├── WeeklyChart.tsx      # 8-week attendance trend chart
│   │   ├── SemesterProgress.tsx # Semester timeline progress bar
│   │   ├── SplashScreen.tsx     # Branded launch animation
│   │   ├── BottomNav.tsx        # Tab navigation
│   │   ├── SubjectCard.tsx      # Subject attendance card
│   │   ├── SubjectModal.tsx     # Add/edit subject modal
│   │   ├── TodayList.tsx        # Daily schedule list (1-tap + swipe-to-undo)
│   │   ├── TimetableGrid.tsx    # Weekly timetable grid
│   │   ├── LegalModal.tsx       # Privacy policy & terms modal
│   ├── pages/                # Screen-level views
│   │   ├── Home.tsx             # Dashboard (with search, filter chips & sorting)
│   │   ├── Today.tsx            # Today's schedule (with progress bar)
│   │   ├── Statistics.tsx       # Analytics (with WeeklyChart & WhatIfSimulator)
│   │   ├── Settings.tsx         # 10 modular settings sub-pages + search
│   │   ├── Setup.tsx            # First-run setup
│   │   ├── SubjectDetail.tsx    # Individual subject view
│   │   └── CalendarView.tsx     # Calendar view
│   ├── store/                # Zustand state management
│   │   ├── useSubjects.ts
│   │   ├── useAttendance.ts
│   │   └── useSettings.ts
│   ├── lib/                  # Business logic & utilities
│   │   ├── biometrics.ts        # Capacitor BiometricAuth & WebAuthn wrapper
│   │   ├── calculations.ts      # Attendance math engine
│   │   ├── validation.ts        # Input sanitisation & import validation
│   │   ├── notifications.ts     # Local notification scheduling (collision-free)
│   │   ├── permissions.ts       # Native permission requests
│   │   ├── storage.ts           # Data migration, persistence, & CSV/PDF export
│   │   ├── shareCard.ts         # Share card image generation
│   ├── App.tsx               # Root component
│   ├── App.css
│   ├── main.tsx              # React entry point
│   └── index.css             # Global styles
├── index.html                # HTML entry (with CSP meta tag)
├── capacitor.config.ts       # Capacitor configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Android Studio** (for building the APK)
- **Java JDK 17** (for Gradle)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd BunkCalc1

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

### Building for Android

```bash
# 1. Build the production web bundle
npm run build

# 2. Sync with the Android project
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. Build → Generate Signed APK from Android Studio
```

---

## 🔒 Security

BunkCalc takes security seriously, even as a fully offline application:

| Layer | Implementation |
|---|---|
| **Content Security Policy** | Strict CSP meta tag blocks all external scripts, styles, and connections |
| **Input Sanitisation** | All user inputs are stripped of HTML, script tags, control characters, and zero-width unicode |
| **Import Validation** | JSON import payloads are schema-validated with prototype pollution detection & date validation |
| **Type Safety** | Full TypeScript with strict mode across the entire codebase (0 ESLint errors) |
| **No Secrets in Code** | Zero API keys, tokens, or credentials — the app has no backend |
| **Secure Storage** | Data persisted via Capacitor Preferences (Android SharedPreferences, encrypted) |

---

## 🎨 Design Philosophy

- **Local-first**: Your data never leaves your device
- **Proactive, not reactive**: The app tells you what to do _before_ it's too late
- **Respectful**: No ads, no tracking, no analytics, no subscriptions
- **Beautiful**: Polished dark/light/OLED UI with 100% vector icons and haptic feedback
- **Accessible**: Designed for one-handed use with a clear information hierarchy

---

## 📋 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | Run ESLint across the codebase |
| `npm run preview` | Preview the production build locally |
| `npx cap sync android` | Sync web assets → Android native project |
| `npx cap open android` | Open the Android project in Android Studio |

---

## 📄 License

This project is **private** and not open-source. All rights reserved.

---

<div align="center">

**Built with ❤️ for students who know when to show up — and when not to.**

`v2.2.1` · Developed by [PinecoXZ](https://github.com/PinecoXZ)
`v2.2.2` · Developed by [PinecoXZ](https://github.com/PinecoXZ)

</div>
