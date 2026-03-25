# BruceLink

BruceLink is a React Native Android app for controlling the [Bruce ESP32 firmware](https://github.com/pr3y/Bruce) over the device's local WiFi access point.

## Features

- Login with configurable device base URL and cookie-based session handling
- Dashboard with firmware version and SD/LittleFS usage indicators
- File Explorer for SD/LittleFS browsing, upload, download, rename, delete, create file, and create folder
- One-tap execution for supported payload files (`.ir`, `.sub`, `.js`, `.txt`, `.mp3`)
- File Editor with save and run actions plus unsaved-change protection
- Terminal command interface with quick command chips and recent history
- Navigator screen mirror (`/getscreen`) with D-pad command controls
- Settings actions for credential update, reboot, and logout

## Tech Stack Used

- React Native `0.84.1` (bare workflow)
- React `19.2.3`
- TypeScript `5.x`
- Axios for HTTP requests
- `@react-native-cookies/cookies` for cookie interoperability
- `@react-native-async-storage/async-storage` for session/base URL persistence
- `react-native-fs` for file download and cache handling
- React Navigation (`@react-navigation/native`, `@react-navigation/native-stack`)
- `react-native-vector-icons` for UI iconography
- `react-native-webview` for Navigator rendering
- Android Gradle build system (APK generation)

## Pre-requisites

- Node.js `>= 22.11.0`
- npm (bundled with Node.js)
- JDK 17
- Android Studio + Android SDK + emulator/device
- A Bruce firmware device (recommended for full testing)

## Setup

```bash
git clone https://github.com/kevsmir02/brucelink.git
cd brucelink
npm install
```

Run the app on Android:

```bash
# terminal 1
npm start

# terminal 2
npm run android
```

## Commands for Building APK

From project root:

```bash
# debug install/run via React Native CLI
npm run android

# release APK via package script
npm run android:release
```

Or directly via Gradle:

```bash
cd android

# debug APK
./gradlew assembleDebug

# release APK
./gradlew assembleRelease
```

APK output paths:

- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`

Optional install with ADB:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

> Note: release is currently debug-signed unless you configure your own production keystore.

## How to Use the App Itself

1. Connect your Android phone to the Bruce AP (default SSID is usually `BruceNet`).
2. Open BruceLink.
3. In Login, enter base URL (example: `http://172.0.0.1`), username, and password.
4. Tap Connect.
5. Use Dashboard to verify firmware version and storage.
6. Use File Explorer to manage files in `sd` and `littlefs`.
7. Open files in File Editor to edit/save/run.
8. Use Terminal to send direct commands.
9. Use Navigator to mirror the TFT output and send nav commands.
10. Use Settings to change credentials, reboot, or logout.

## API List

Base URL is configurable in-app (default commonly `http://172.0.0.1`).

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/login` | Authenticate and obtain `BRUCESESSION` cookie |
| `GET` | `/logout` | End current session |
| `GET` | `/systeminfo` | Read firmware/system/storage info |
| `GET` | `/listfiles` | List files and folders (`fs`, `folder`) |
| `GET` | `/file?action=edit` | Fetch text file content |
| `GET` | `/file?action=download` | Download a file |
| `GET` | `/file?action=delete` | Delete file/folder |
| `GET` | `/file?action=create` | Create folder |
| `GET` | `/file?action=createfile` | Create file |
| `POST` | `/upload` | Upload file (multipart) |
| `POST` | `/rename` | Rename file/folder (multipart) |
| `POST` | `/edit` | Save file content (multipart) |
| `POST` | `/cm` | Send terminal/CLI command |
| `GET` | `/wifi` | Update WebUI credentials (`usr`, `pwd`) |
| `GET` | `/reboot` | Reboot device |
| `GET` | `/getscreen` | Fetch TFT draw stream for Navigator |

## Project Structure

```text
.
├── App.tsx
├── src/
│   ├── components/
│   │   ├── CommandChip.tsx
│   │   ├── FileItem.tsx
│   │   ├── PromptModal.tsx
│   │   ├── QuickAction.tsx
│   │   └── StorageBar.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   ├── FileEditorScreen.tsx
│   │   ├── FileExplorerScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── NavigatorScreen.tsx
│   │   ├── NavigatorWebCanvas.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── TerminalScreen.tsx
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── constants.ts
│       ├── fileHelpers.ts
│       └── vibrate.ts
├── android/
├── ios/
└── __tests__/
```

## License

MIT
