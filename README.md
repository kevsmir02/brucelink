# BruceLink

Android app for controlling [Bruce firmware](https://github.com/pr3y/Bruce) devices over a local WiFi AP connection. Android-only. No iOS support.

## Requirements

- Node.js >= 22.11.0
- JDK 17
- Android SDK (API 24+)
- A physical Android device or emulator with network access to the Bruce AP

## Setup

```bash
git clone https://github.com/kevsmir02/brucelink.git
cd brucelink
npm install
```

## Run (development)

```bash
# Terminal 1 — Metro bundler
npm start

# Terminal 2 — build and deploy to device/emulator
npm run android
```

## Build (release APK)

```bash
npm run android:release        # bump patch version, build APK
npm run android:release:minor  # bump minor version, build APK
npm run android:release:major  # bump major version, build APK
npm run android:release:build  # build APK without version bump
```

Output: `android/app/build/outputs/apk/release/BruceLink-v<version>-build<code>-release.apk`

## Test

```bash
npm test
npx tsc --noEmit
```

## Mock AP (no device needed)

```bash
npm run mock:ap
```

Runs a local Express server that mimics the Bruce HTTP API. Useful for UI development without hardware.

## Documentation

- Architecture, screens, API surface: [`DOCUMENTATION.md`](DOCUMENTATION.md)
- Firmware endpoint reference: `docs/bruce_firmware_api_docs.md`
- Release history: [`CHANGELOG.md`](CHANGELOG.md)

## Current Limitations & Future Roadmap

BruceLink currently operates as a "Smart Remote" and File Manager. Because the stock Bruce firmware (v1.14) relies on a Presentation Layer architecture (drawing scan results directly to the screen) rather than a Data Layer (serving JSON APIs), the app cannot natively render complex hardware outputs like BLE scans, NRF24 targets, or GPS coordinates. 

To prevent device kernel panics, these features are currently operated via a live remote-control screen mirror (`/getscreen`). 

**Phase 2 Roadmap:** To achieve seamless, native mobile screens for all features, we will need to fork and develop **custom C++ firmware**. By adding custom REST API endpoints (e.g., `/api/ble/scan`), the device will be able to serve structured JSON data directly to BruceLink, allowing for a fully native smartphone experience.

## License

MIT
