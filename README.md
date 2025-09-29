# rn-expo-background-music

Background audio reference app implemented with Expo + React Native Track Player.

## Prerequisites

- Node.js 20.19.4 or newer (React Native 0.81 requires it).
- Commands use `npx`; no global Expo CLI install required.
- **iOS**: Xcode 15+, CocoaPods reachable via `/opt/homebrew/bin/pod`.
- **Android**: JDK 17 (e.g. `brew install --cask temurin17`) and Android SDK (Platform Tools, build-tools 35/36).

Shell configuration example:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH
```

If `android/local.properties` is missing, create it with:

```
sdk.dir=/Users/<your-username>/Library/Android/sdk
```

## Install dependencies

```bash
cd expo-bgm-player
npm install
```

> React alignment: the project pins `react` and `@types/react` to `19.1.0`. Upgrading React without matching the renderer will trigger Metro errors.

## Build and run (iOS)

1. Ensure CocoaPods works (`pod --version`). If Homebrew installed it, run `brew unlink cocoapods && brew link cocoapods` to expose `/opt/homebrew/bin/pod`.
2. From the repo:

   ```bash
   cd expo-bgm-player
   npx expo prebuild               # only when native folders need regeneration
   PATH=/opt/homebrew/bin:$PATH npx expo run:ios
   ```

   - If `pod install` fails with `~/.netrc` permissions, run `chmod 600 ~/.netrc`.
   - The first run installs the development client (`com.example.expobgmplayer`) in the simulator.

## Build and run (Android)

1. Enable Developer Options + USB debugging on the device, connect via USB, allow the RSA prompt.
2. Confirm `adb devices` lists your handset as `device`.
3. Build the development client:

   ```bash
   cd expo-bgm-player
   npx expo run:android
   ```

   Gradle downloads required SDK components automatically. Ensure `JAVA_HOME` points to a JDK 17 install or the build will fail with "No Java compiler found".

## Start Metro / load the JS bundle

```bash
cd expo-bgm-player
npx expo start --dev-client
```

- Press `i` for the iOS simulator, `a` for Android. To target a specific simulator, boot it manually and set `EXPO_IOS_SIMULATOR_DEVICE="iPhone 16"` before running `expo start`.
- If Metro logs a React renderer mismatch, stop all Metro instances and rerun with `npx expo start --dev-client --clear`.

## Share builds with teammates (EAS)

```bash
cd expo-bgm-player
npx eas login                     # once per machine
npx eas build -p ios --profile development --non-interactive
npx eas build -p android --profile development --non-interactive
```

- Development profile produces dev clients suitable for scanning the Metro QR code.
- The Android command prints a link (and QR) to the signed `.apk`; the iOS command yields a build you can distribute via TestFlight or install locally with `eas device:create` + `eas build -p ios --profile development`.
- Add `--tunnel` to `expo start --dev-client` so remote teammates can load your Metro bundle without VPN.

## Debugging tips

- Shake the device (or press `Cmd+D` / `Ctrl+M`) to open the Expo dev menu in the development build.
- The Metro terminal streams logs; use `r` to reload, `m` to toggle the menu, `shift+m` for more tools.
- Background playback may log "player is not initialized" if remote controls fire before `setupPlayer` completes; playback continues once initialization finishes.

-## Maintenance notes

- Android build patches `react-native-track-player` via `patch-package` (see `patches/react-native-track-player+4.1.2.patch`) so nullable bundles compile on both local and EAS builds. `npm install` automatically reapplies the patch via the `postinstall` script.
- Keep `newArchEnabled` set to `false` in `app.json` unless React Native Track Player gains full Fabric compatibility.
