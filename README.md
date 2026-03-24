# BruceLink

A React Native Android app for controlling the [Bruce ESP32 penetration testing firmware](https://github.com/pr3y/Bruce) over its local WiFi access point.

## Features

- **Login** — connects to the Bruce device at a configurable IP with cookie-based session management
- **Dashboard** — live firmware version, SD card and LittleFS storage usage bars, quick-action grid
- **File Explorer** — browse SD and LittleFS filesystems, upload/download/rename/delete files, create folders/files, one-tap execution of `.ir`, `.sub`, `.js`, `.txt`, `.mp3` payloads
- **File Editor** — full-screen monospace editor with save and run buttons, unsaved-change guard
- **Terminal** — fire-and-forget CLI interface (`/cm` endpoint), quick-command chips, command history
- **Navigator** — mirrors the device TFT via `/getscreen` in an embedded WebView canvas + D-pad (`nav` commands)
- **Settings** — change WebUI credentials, reboot device, logout

## Tech Stack

| Package | Purpose |
|---|---|
| React Native 0.84 (bare workflow) | App framework |
| TypeScript | Type safety throughout |
| Axios | HTTP client with cookie interceptor |
| `@react-native-async-storage/async-storage` | Persisting session token and base URL |
| `react-native-fs` | Streaming file downloads to Android Downloads folder |
| `@react-navigation/native-stack` | Screen navigation |
| `react-native-vector-icons` (MaterialCommunityIcons) | UI icons |
| `react-native-webview` | Navigator screen TFT canvas (native module — requires a full Android rebuild after install) |

## Prerequisites

- Node.js ≥ 22
- Android Studio with an emulator or physical Android device
- JDK 17
- A device running Bruce ESP32 firmware (or just the emulator for UI development)

## Setup

```bash
git clone https://github.com/kevsmir02/brucelink.git
cd brucelink
npm install
```

### Android

```bash
# Start Metro bundler
npm start

# In a separate terminal, build and install
npm run android
```

## Build APK (Debug and Release)

### Debug APK

Build a local debug APK:

```bash
cd android
./gradlew assembleDebug
```

Output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK

Build a release APK:

```bash
cd android
./gradlew assembleRelease
```

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Install it manually with ADB (optional):

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

> Note: the current Gradle config signs release builds with the debug keystore. For Play Store or production distribution, configure your own release keystore first.

## Connecting to a Bruce Device

1. On your Android device, connect to the **BruceNet** WiFi access point (default password: `brucenet`)
2. Open BruceLink
3. Enter the device URL (default `http://172.0.0.1`), username (`admin`), and password (`admin`)
4. Tap **Connect**

> The app communicates exclusively over HTTP on the local AP — no internet connection is used or required.

## How to Use the App

1. Connect your phone to the Bruce device AP (default SSID: BruceNet).
2. Open BruceLink and log in with device IP, username, and password.
3. On **Dashboard**, verify firmware and storage status.
4. Open **File Explorer** to browse SD/LittleFS, then upload/download/create/rename/delete files and folders.
5. Tap a file to open **File Editor**, edit content, and save or run supported payload files.
6. Use **Terminal** to send direct CLI commands with quick chips and command history.
7. Use **Navigator** to mirror the TFT screen and send D-pad navigation commands.
8. In **Settings**, update WebUI credentials, reboot the device, or logout.

### Typical Workflow

1. Login.
2. Check health on Dashboard.
3. Transfer or edit scripts in File Explorer/File Editor.
4. Trigger execution (run file or send command from Terminal).
5. Monitor interaction in Navigator.

### Skip login (development builds only)

In **`__DEV__`** (debug) builds, the login screen includes **Skip login — tweak UI (dev only)**. That opens the app immediately with **local placeholder data** so you can work on screens without a device. This control is **not** included in release builds.

## API Overview

All communication targets the Bruce REST API at your device URL (default `http://172.0.0.1` on many Bruce AP setups; configurable):

| Endpoint | Purpose |
|---|---|
| `POST /login` | Cookie-based auth (302 redirect, `BRUCESESSION` token) |
| `GET /systeminfo` | Firmware version, storage stats |
| `GET /listfiles` | Custom line-delimited directory listing |
| `GET /file` | Download, edit, delete, create file/folder |
| `POST /upload` | Multipart file upload |
| `POST /rename` | Rename file or folder |
| `POST /edit` | Save file content |
| `POST /cm` | Send CLI command (fire-and-forget) |
| `GET /wifi` | Update WebUI credentials |
| `GET /reboot` | Reboot device |
| `GET /getscreen` | Raw TFT draw log (Navigator preview) |

## Troubleshooting

### `RNCWebViewModule could not be found` (Navigator screen)

`react-native-webview` adds **native** code. After `npm install`, you must **reinstall the Android app** (not only reload JS in Metro):

```bash
cd android && ./gradlew clean && cd .. && npx react-native run-android
```

Until you do, the Navigator tab shows in-app instructions instead of crashing.

### `./gradlew clean` fails: `GLOB mismatch` / `react-native-document-picker` / missing `codegen/jni`

After removing or swapping a native module, **old CMake/Ninja state** under `android/app/.cxx` can still reference deleted paths (e.g. `node_modules/react-native-document-picker/...`). `clean` then tries to reconfigure CMake and errors.

**Fix:** delete native/build outputs, then build (skip `clean` if it keeps failing):

```bash
rm -rf android/app/.cxx android/app/build android/build
cd android && ./gradlew assembleDebug
# or: cd .. && npx react-native run-android
```

## Project Structure

```
src/
├── services/api.ts          # Axios instance, cookie interceptor, all API calls
├── types/index.ts           # Shared TypeScript interfaces
├── navigation/AppNavigator  # Stack navigator + auth state
├── screens/
│   ├── LoginScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── FileExplorerScreen.tsx
│   ├── FileEditorScreen.tsx
│   ├── TerminalScreen.tsx
│   ├── NavigatorScreen.tsx   # Loads WebView only if native module is present
│   ├── NavigatorWebCanvas.tsx
│   └── SettingsScreen.tsx
├── components/
│   ├── FileItem.tsx
│   ├── StorageBar.tsx
│   ├── QuickAction.tsx
│   └── CommandChip.tsx
├── hooks/useAuth.ts
└── utils/
    ├── constants.ts         # Colors, storage keys, executable extension map
    ├── fileHelpers.ts       # /listfiles parser, path helpers
    └── vibrate.ts           # Safe vibration wrapper
```

## License

MIT
