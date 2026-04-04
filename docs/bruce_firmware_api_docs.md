# Bruce Firmware: Mobile App Integration Reference

> [!IMPORTANT]
> This is the **canonical reference** for AI agents and developers implementing features in BruceLink.
> Firmware source: `/home/toji/Desktop/Projects/firmware/`

## 📡 Communication Model

The Bruce Firmware exposes an `ESPAsyncWebServer` whenever WiFi is active (AP mode: `BruceNet`, or STA mode). **All communication is standard HTTP.** Authentication uses a `BRUCESESSION` cookie obtained via `/login`.

---

## 🔑 HTTP Endpoints (webInterface.cpp)

| Endpoint | Method | Params / Body | Response | Notes |
|----------|--------|---------------|----------|-------|
| `/login` | POST | `username=xx&password=xx` (urlencoded) | Sets `BRUCESESSION` cookie | Default creds: `admin/admin` |
| `/logout` | GET | — | Clears session | |
| `/systeminfo` | GET | — | JSON: `{ BRUCE_VERSION, SD: {free,used,total}, LittleFS: {free,used,total} }` | Use for Dashboard & Settings "About" |
| `/listfiles` | GET | `fs=SD\|LittleFS`, `folder=/path/` | Custom text format (see `parseFileList` in `fileHelpers.ts`) | |
| `/file` | GET | `fs`, `name`, `action=download\|delete\|create\|createfile\|image` | Varies by action | `action=image` returns raw image bytes |
| `/rename` | POST | `fs`, `fileName`, `filePath` (multipart) | Text result | |
| `/edit` | POST | `name`, `content`, `fs` (multipart) | Text result | |
| `/upload` | POST | `file` (binary), `folder`, `fs` (multipart) | Text result | |
| `/cm` | POST | `cmnd=<command>` (urlencoded) | Plain text response from CLI | **THE GOD ENDPOINT** — see below |
| `/getscreen` | GET | — | Raw binary octet-stream of TFT display buffer | Used by Navigator screen mirror |

> [!WARNING]
> **React Native FormData Bug**: Never use `FormData()` / `multipart/form-data` with `/cm`. Android Axios/fetch drops `boundary` headers. **Always use `application/x-www-form-urlencoded`** for command submission.

---

## ⚡ The `/cm` God Endpoint

Almost every firmware feature is accessible via the CLI. The `/cm` endpoint bridges the entire CLI to HTTP. To add new app features, **you do NOT modify firmware** — you discover the CLI command and send it to `/cm`.

### Usage Pattern
```typescript
// In api.ts — sendCommand() already handles this correctly
const body = `cmnd=${encodeURIComponent("nav sel")}`;
apiClient.post("/cm", body, {
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});
```

---

## 🎮 Complete CLI Command Reference

Extracted from every `create*Commands()` function in `/src/core/serial_commands/*.cpp`.

### Navigation (`util_commands.cpp`)
Used by the Navigator D-pad. The `duration` param controls hold time in ms.

| Command | Args | Description |
|---------|------|-------------|
| `nav up` | `[duration]` | D-pad up |
| `nav down` | `[duration]` | D-pad down |
| `nav next` | `[duration]` | D-pad right |
| `nav prev` | `[duration]` | D-pad left |
| `nav sel` / `nav select` | `[duration]` | Select / OK button |
| `nav esc` | `[duration]` | Back / Escape |
| `nav nextpage` | `[duration]` | Page Up |
| `nav prevpage` | `[duration]` | Page Down |

### Menu System (`util_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `options` | `[index]` | List available menu options, or select option by index |
| `optionsJSON` | — | Returns current menu options as JSON |
| `loader list` | — | List all available applications |
| `loader open <appname>` | `appname` | Launch an application by name |

### System Info & Utilities (`util_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `info` / `!` / `device_info` | — | Firmware version, MAC, WiFi status, device name |
| `help` / `?` | — | Full CLI help text |
| `uptime` | — | Device uptime `HH:MM:SS` |
| `date` | — | Current date/time (if RTC set) |
| `free` | — | Heap and PSRAM usage |
| `i2c` | — | Scan I2C bus for devices |
| `display start\|stop\|status\|dump\|info` | `option` | TFT display logging control |

### Power Management (`power_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `poweroff` | — | Deep sleep (hardware reset to wake) |
| `reboot` | — | `ESP.restart()` |
| `sleep` | — | Light sleep mode |
| `power off\|reboot\|sleep` | subcommand | Composite alternative |

### WiFi (`wifi_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `wifi on` | — | Connect to known network or start AP |
| `wifi off` | — | Disconnect WiFi |
| `wifi add <SSID> <Password>` | `ssid`, `pwd` | Save WiFi credentials |
| `webui` | `[--noAp]` | Start the web UI server |
| `arp` | — | ARP host scanner *(non-LITE)* |
| `sniffer` | — | Raw WiFi packet sniffer *(non-LITE)* |
| `listen` | — | Listen on TCP port *(non-LITE)* |

### IR (`ir_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `ir` | — | Turn off IR LED |
| `ir rx` | `[--raw]` | Receive IR signal (10s timeout) |
| `ir tx <protocol> <address> <command>` | 3 args (8-char hex each) | Send decoded IR signal |
| `ir tx_raw <frequency> <samples>` | `frequency`, `samples` | Send raw IR data |
| `ir tx_from_file <filepath>` | `filepath`, `[hideDefaultUI]` | Transmit `.ir` file from storage |
| `ir tx_from_buffer` | — | Transmit IR from serial buffer |
| `IRSend <json>` | Tasmota JSON format | Send IR via Tasmota-compatible JSON |

### RF / SubGHz (`rf_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `subghz rx` / `rf rx` | `[frequency]`, `[--raw]` | Receive RF signal |
| `subghz tx` / `rf tx` | `key`, `frequency`, `te`, `count` | Send decoded RF signal |
| `subghz scan` / `rf scan` | `start_frequency`, `stop_frequency` | Scan frequency range |
| `subghz tx_from_file` / `rf tx_from_file` | `filepath`, `[hideDefaultUI]` | Transmit `.sub` file from storage |
| `subghz tx_from_buffer` / `rf tx_from_buffer` | — | Transmit RF from serial buffer |
| `RfSend <json>` | Tasmota JSON format | Send RF via Tasmota-compatible JSON |

### BadUSB (`badusb_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `badusb run_from_file <filepath>` / `bu run_from_file <filepath>` | `filepath` | Execute `.txt` Ducky Script payload |
| `badusb run_from_buffer` / `bu run_from_buffer` | — | Execute from serial buffer |

### JavaScript Interpreter (`interpreter_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `js <filepath>` / `run <filepath>` | filepath | Execute `.js`/`.bjs` script file |
| `js run_from_file <filepath>` | filepath | Same, explicit subcommand |
| `js run_from_buffer [size]` | `[size]` | Execute JS from serial buffer |
| `js exit` | — | Stop running interpreter |

### Storage (`storage_commands.cpp`)

| Command | Aliases | Args | Description |
|---------|---------|------|-------------|
| `storage list <path>` | `ls`, `dir` | `[filepath]` | List directory contents |
| `storage read <path>` | `cat`, `type` | `filepath` | Print file contents |
| `storage remove <path>` | `rm`, `del` | `filepath` | Delete file |
| `storage mkdir <path>` | `md`, `mkdir` | `filepath` | Create directory |
| `storage rmdir <path>` | `rmdir` | `filepath` | Remove directory |
| `storage rename <path> <newName>` | — | `filepath`, `newName` | Rename file |
| `storage copy <path> <newName>` | — | `filepath`, `newName` | Copy file |
| `storage write <path> [size]` | — | `filepath`, `[size]` | Write file from serial *(non-LITE)* |
| `storage md5 <path>` | `md5` | `filepath` | MD5 hash of file |
| `storage crc32 <path>` | `crc32` | `filepath` | CRC32 of file |
| `storage stat <path>` | — | `filepath` | File size, type, last modified |
| `storage free <sd\|littlefs>` | — | `storage_type` | Free space info |

### Screen / Display (`screen_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `screen brightness <0-255>` / `screen br <0-255>` | `value` | Set backlight brightness |
| `screen color rgb <r> <g> <b>` | `red`, `green`, `blue` | Change UI accent color (RGB) |
| `screen color hex <RRGGBB>` | `value` | Change UI accent color (hex) |
| `clock` | — | Show clock / get current time |

### Sound (`sound_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `tone <freq> <duration>` / `beep` | `frequency`, `duration` | Play square wave tone |
| `play <song>` / `music_player` | `song` (RTTTL string or file path) | Play audio (file or RTTTL) *(speaker required)* |
| `tts <text>` / `say <text>` | `text` | Text-to-speech *(speaker required)* |

### Settings (`settings_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `settings` | — | Print all current settings as JSON |
| `settings <name>` | `setting_name` | Print one setting value |
| `settings <name> <value>` | `setting_name`, `setting_value` | Change a setting |
| `factory_reset` | — | Reset all settings to defaults |

**Configurable setting names**: `priColor`, `rot`, `dimmerSet`, `bright`, `tmz`, `soundEnabled`, `wifiAtStartup`, `webUI` (username,password), `wifiAp` (ssid,password), `wifi` (ssid,password), `bleName`, `irTx`, `irTxRepeats`, `irRx`, `rfTx`, `rfRx`, `rfModule`, `rfFreq`, `rfFxdFreq`, `rfScanRange`, `rfidModule`, `wigleBasicToken`, `devMode`, `disabledMenus`

### Crypto (`crypto_commands.cpp`) *(non-LITE)*

| Command | Args | Description |
|---------|------|-------------|
| `crypto decrypt_from_file <path> <password>` / `decrypt` | `filepath`, `password` | Decrypt and print file |
| `crypto encrypt_to_file <path> <password>` / `encrypt` | `filepath`, `password` | Encrypt serial input to file |
| `crypto type_from_file <path> <password>` | `filepath`, `password` | Decrypt and type via HID *(USB_as_HID only)* |

### GPIO (`gpio_commands.cpp`)

| Command | Args | Description |
|---------|------|-------------|
| `gpio mode <pin> <mode>` | pin number, mode (0-9) | Set GPIO pin mode |
| `gpio set <pin> <value>` | pin number, value (0/1) | Set GPIO pin HIGH/LOW |
| `gpio read <pin>` | pin number | Read GPIO pin state |

---

## 🔮 Feature Implementation Playbook

When implementing a new BruceLink feature:

1. **Identify the CLI command** from the tables above.
2. **Call `sendCommand(cmd)`** from `api.ts` — it already handles `/cm` correctly.
3. **No firmware modification needed** — the entire CLI is already exposed.
4. **For file-based features** (IR replay, BadUSB, SubGHz): Use the File Explorer to browse/upload the payload file, then execute it via the matching `*_from_file` command.

### Quick Recipes

| App Feature | Command to Send |
|-------------|-----------------|
| Reboot device | `reboot` |
| IR replay file | `ir tx_from_file /path/to/file.ir` |
| Run Ducky Script | `badusb run_from_file /path/to/payload.txt` |
| SubGHz replay | `subghz tx_from_file /path/to/signal.sub` |
| Execute JS script | `js /path/to/script.bjs` |
| Play audio file | `play /path/to/song.mp3` |
| Get all settings | `settings` |
| Change brightness | `screen brightness 200` |
| Factory reset | `factory_reset` |
| Launch an app | `loader open WiFi` |
| Get menu options | `optionsJSON` |
