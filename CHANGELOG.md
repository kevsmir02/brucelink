# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project follows Semantic Versioning.

## [Released]

### Changed
- 2026-04-05 Changelog automation now records entries only for commits that touch mobile app code, Android build/config paths, or mobile test assets.
- 2026-04-05 4355e72 chore: add changelog automation and release tooling
- 2026-04-05 b84b3a3 chore: update docs and fix tooling diagnostics
- 2026-04-05 106120e feat(tactical): add operation screens and harden android sdk env
- 2026-04-10 ab1338d fix(theme): convert all screens and components to dynamic theme tokens
<!-- AUTO-CHANGELOG-ENTRIES -->

## [1.1.0] - 2026-04-05

### Added
- Initial Android release baseline for BruceLink firmware control flows.

## [2.0.0] - 2026-04-10

### Fixed
- Light/dark mode: replaced all static `COLORS.*` references (baked at
  module load time) with `useTheme()` + `makeStyles(theme)` so the UI
  responds correctly when the user switches themes at runtime.
  Affected: BrandedHeaderTitle, CommandChip, StorageBar, ThemeModeSelector,
  FsToggle, ImagePreviewModal, PromptModal, FileItem, FileRowWithDelete,
  ExplorerFab, FileActionSheet, ErrorBoundary, FileEditorScreen,
  NavigatorWebCanvas, PayloadRunnerScreen, TerminalScreen.
- DashboardScreen: RF/Wireless quick-action buttons were all navigating to
  `PayloadRunner`; now wired to the correct screens (SubGhz, Infrared,
  WifiAttack, Ble).
- DashboardScreen: divider background was a hardcoded dark rgba value;
  replaced with `theme.colors.border`.
- DashboardScreen: non-existent `typography.sizes.lg/sm/xs` token
  references replaced with literal values.
- FileExplorerScreen: removed stray `});` syntax error; replaced
  non-existent `errorDim` and `primaryDim` tokens with valid equivalents.
- mock-access-point: login endpoint now returns HTTP 200 instead of 302.
  OkHttp (Android) follows redirects before Axios sees the response,
  causing the 401 interceptor to fire a false "session expired" toast.
- Gradle wrapper: downgraded from 9.0.0 to 8.13 to match AGP 8.12.0
  maximum supported Gradle version.

### Added
- mock-access-point: credentials hint printed to stdout on startup.
