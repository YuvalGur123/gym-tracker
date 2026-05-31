# 💪 Gym Tracker

A mobile workout tracking app built with React Native and Expo. Log sessions, track progress over time, and see personal records — all stored locally on your device.


## Features

### Programs
- Create custom workout programs with any exercises
- Edit, delete, and **drag to reorder** programs
- Reorder exercises within a program via drag handle

### Sessions
- Start a session from any program
- **Live session timer** displayed in the header
- Log sets with weight and reps per exercise
- **Quick-fill** — weight and reps pre-filled from your last session
- **Personal record detection** — 🏆 badge appears when you beat your best weight
- Delete incorrectly logged sets mid-session
- **Drag to reorder exercises** mid-session
- Confirmation dialog on end with total sets and duration

### History
- Full session history sorted by date
- Tap any session to view a detailed breakdown — sets, reps, volume per exercise
- Stats summary: total sets, exercises, and volume per session

### Progress
- Track max weight or total volume over time
- Filter by exercise or by program
- Visual line chart with session-by-session trend

### General
- All data stored **locally on device** via SQLite (no account needed)
- **OTA updates** via EAS Update — no re-download needed for JS changes
- Safe area aware — works correctly on phones with gesture navigation bars and notches
- Swipe between tabs (Home, History, Progress)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) SDK 55 |
| Navigation | [React Navigation](https://reactnavigation.org/) |
| Database | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) |
| Build & Updates | [EAS Build](https://docs.expo.dev/build/introduction/) + [EAS Update](https://docs.expo.dev/eas-update/introduction/) |
| Language | TypeScript |

---

## Project Structure

```
gym-tracker/
├── App.tsx                          # Root — navigation, providers
├── src/
│   ├── types.ts                     # Shared TypeScript types
│   ├── components/
│   │   └── ExerciseCard.tsx         # Set logging card used in sessions
│   ├── db/
│   │   └── database.ts              # SQLite setup, all queries
│   └── screens/
│       ├── HomeScreen.tsx           # Program list with drag reorder
│       ├── CreateProgramScreen.tsx  # Create / edit programs
│       ├── SessionScreen.tsx        # Active workout session
│       ├── HistoryScreen.tsx        # Past sessions + detail modal
│       └── ProgressScreen.tsx       # Charts and progress tracking
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas/) (for builds and updates)

### Install dependencies

```bash
npm install
```

### Run locally (Expo Go)

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your phone to run the app instantly without building.

---

## Building

This app uses EAS Build for Android and iOS builds.

### Android APK (sideload)

```bash
eas build --platform android --profile preview
```

Download the `.apk` from the EAS dashboard and install it directly on your Android device. Enable **Install from unknown sources** in your Android settings if prompted.

### iOS

```bash
eas build --platform ios
```

Requires an Apple Developer account ($99/year).

---

## Deploying Updates

For JavaScript-only changes (UI, logic, styles), push an OTA update without rebuilding:

```bash
eas update --branch main --message "your update message"
```

The installed app will automatically download and apply the update on next launch.

> **Note:** A full rebuild is required when adding new native packages, changing `app.json`, or modifying native Android/iOS files.
