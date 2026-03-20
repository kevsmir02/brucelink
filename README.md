# BruceLink

A React Native Android app for controlling the [Bruce ESP32 penetration testing firmware](https://github.com/pr3y/Bruce) over its local WiFi access point.

## Features

- **Login** — connects to the Bruce device at a configurable IP with cookie-based session management
- **Dashboard** — live firmware version, SD card and LittleFS storage usage bars, quick-action grid
- **File Explorer** — browse SD and LittleFS filesystems, upload/download/rename/delete files, create folders/files, one-tap execution of `.ir`, `.sub`, `.js`, `.txt`, `.mp3` payloads
- **File Editor** — full-screen monospace editor with save and run buttons, unsaved-change guard
- **Terminal** — fire-and-forget CLI interface (`/cm` endpoint), quick-command chips, command history
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

## Connecting to a Bruce Device

1. On your Android device, connect to the **BruceNet** WiFi access point (default password: `brucenet`)
2. Open BruceLink
3. Enter the device IP (default `192.168.4.1`), username (`admin`), and password (`bruce`)
4. Tap **Connect**

> The app communicates exclusively over HTTP on the local AP — no internet connection is used or required.

## API Overview

All communication targets the Bruce REST API at `http://192.168.4.1` (configurable):

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
