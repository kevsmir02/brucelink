# BruceLink

BruceLink is an Android React Native app for controlling Bruce firmware devices over a local WiFi access point.

This repository is Android-only and ships APK-based releases.

## Quick Start

```bash
git clone https://github.com/kevsmir02/brucelink.git
cd brucelink
npm install

# terminal 1
npm start

# terminal 2
npm run android
```

## Build Commands

```bash
# Debug install/run
npm run android

# Release builds
npm run android:release        # patch bump + release APK
npm run android:release:minor  # minor bump + release APK
npm run android:release:major  # major bump + release APK
npm run android:release:build  # release APK, no version bump
```

APK outputs:

- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/BruceLink-v<version>-build<code>-release.apk`

## Documentation

- Full repository documentation: `DOCUMENTATION.md`
- Firmware endpoint reference: `docs/bruce_firmware_api_docs.md`
- Release history: `CHANGELOG.md`

## Core Product Features

- AP login with persisted base URL + session handling
- Dashboard with firmware and storage visibility
- SD/LittleFS file explorer + editor + runner workflows
- Terminal and quick command execution
- Navigator screen stream with control actions
- Settings for credentials, reboot, logout, and theme mode

## License

MIT
