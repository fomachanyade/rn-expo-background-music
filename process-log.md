# Process Log

- [x] Read `AGENT.md` and captured requirements for Expo background audio setup.
- [x] Scaffolded `expo-bgm-player` TypeScript project with Expo 54 dependencies and required dev tooling.
- [x] Configured `app.json` for iOS background audio (`UIBackgroundModes`) and Android foreground service/permissions.
- [x] Added TrackPlayer service (`service.ts`) with background event handlers and iOS audio session category.
- [x] Updated `index.ts` to register the TrackPlayer service and `App.tsx` with minimal playback UI/logic.
- [x] Installed native assets (`android/`, `ios/`) via `npx expo prebuild`.
- [x] `npx expo run:ios` (CocoaPods relinked, Metro cache cleared, React 19.1.0 alignment; dev client now boots simulator).
- [x] `npx expo run:android` (installed Temurin 17 JDK, configured `ANDROID_HOME`, added `local.properties`, patched RNTP nullable bundle handling; Pixel 7a dev client running).

Follow-up fixes:
- Resolved CocoaPods CLI path (`brew unlink cocoapods && brew link cocoapods`) and `~/.netrc` permissions (chmod 600) before re-running iOS build.
- Downgraded `react`/`@types/react` to 19.1.0 and restarted Metro (`--clear`) to eliminate renderer mismatch errors.
- Installed Temurin 17 (`brew install --cask temurin17`), exported `JAVA_HOME`, and ensured `sdk.dir` in `android/local.properties` for Gradle.
- Patched `react-native-track-player` via `patch-package` (`patches/react-native-track-player+4.1.2.patch`) so EAS builds pick up nullable bundle guard.
- `npx eas build -p android --profile development --non-interactive` now succeeds (link generated; CLI exits non-zero if interactive prompt suppressed).

Notes:
- `npx expo prebuild` succeeded after removing the TrackPlayer config plugin entry (library does not ship one). iOS audio session is forced via `TrackPlayer.updateOptions`.
- Run `npx expo start --dev-client` after building iOS/Android dev clients to share with teammates.
