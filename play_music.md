了解。codex にそのまま流せる「やること指示書」です。
順番は **① /assets の音源（Beethoven）を再生 → ② CDN の音源（Liszt）を再生**。

---

# 指示書（codex 用）

> 前提：このリポジトリは Expo + React Native Track Player を使う想定。
> まだ未導入なら最初にパッケージ導入～prebuild まで自動化します。

## 0) 依存の導入（未導入なら実行）

```bash
# すでにプロジェクトがある前提。なければ:
# npx create-expo-app@latest expo-bgm-player -t
# cd expo-bgm-player

npm i react-native-track-player expo-dev-client
npm i -D typescript @types/react @types/react-native

# ネイティブプロジェクト生成（初回/設定変更時）
npx expo prebuild
```

---

## 1) 音源ファイル（/assets）を配置

* **ファイル**: `assets/debug_track.mp3`

  * Pixabay からDLした Beethoven のデバッグ用音源をこの名前で保存。
  * すでにある場合はこのままでOK。

---

## 2) 設定ファイルを用意/更新

### 2-1) `app.json` を更新（なければ作成／ある場合は該当キーをマージ）

```json
{
  "expo": {
    "name": "expo-bgm-player",
    "slug": "expo-bgm-player",
    "ios": {
      "supportsTablet": false,
      "infoPlist": {
        "UIBackgroundModes": ["audio"]
      }
    },
    "android": {
      "foregroundService": { "notificationChannelName": "Playback" },
      "permissions": [
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "WAKE_LOCK",
        "BLUETOOTH_CONNECT"
      ]
    },
    "plugins": [
      ["react-native-track-player", { "iosAudioSessionCategory": "playback" }]
    ],
    "assetBundlePatterns": ["assets/**"]
  }
}
```

> 変更後に **`npx expo prebuild`** をもう一度実行しておく。

---

## 3) 再生サービスを登録（バックグラウンド対応）

### 3-1) `service.ts`（新規作成）

```ts
// service.ts
import TrackPlayer, {
  Event,
  Capability,
  RepeatMode,
  AppKilledPlaybackBehavior,
} from "react-native-track-player";

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext().catch(() => {}));
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious().catch(() => {}));

  await TrackPlayer.updateOptions({
    stoppingAppPausesPlayback: false,
    capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
    compactCapabilities: [Capability.Play, Capability.Pause],
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
  });

  await TrackPlayer.setRepeatMode(RepeatMode.Off);
};
```

### 3-2) `index.js`（新規 or 既存に追記）

```js
// index.js
import { registerRootComponent } from "expo";
import App from "./App";
import TrackPlayer from "react-native-track-player";

registerRootComponent(App);
TrackPlayer.registerPlaybackService(() => require("./service"));
```

---

## 4) 共有ユーティリティ

### 4-1) `player.ts`（新規作成）

```ts
// player.ts
import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  Event,
} from "react-native-track-player";

export async function setupPlayer() {
  await TrackPlayer.setupPlayer();
  await TrackPlayer.updateOptions({
    stoppingAppPausesPlayback: false,
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause],
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
  });
  TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
    console.warn("Playback error", e);
  });
}

export async function loadAndPlay(track: Parameters<typeof TrackPlayer.add>[0][0]) {
  await TrackPlayer.reset();
  await TrackPlayer.add([track]);
  await TrackPlayer.play();
}
```

### 4-2) `config.ts`（新規作成：切替用）

```ts
// config.ts
export type SourceMode = "bundled" | "cdn";

// デフォルトは「bundled」(assets)。後で CDN 検証時に env で切替。
export const SOURCE_MODE: SourceMode =
  (process.env.EXPO_PUBLIC_SOURCE_MODE as SourceMode) || "bundled";

// CDN URL（Liszt / La Campanella）
export const CDN_URL =
  process.env.EXPO_PUBLIC_AUDIO_URL ||
  "https://cdn.pixabay.com/audio/2022/09/06/audio_12088c3510.mp3";
```

### 4-3) `tracks.ts`（新規作成：トラック定義）

```ts
// tracks.ts
import { CDN_URL } from "./config";

// ① /assets の音源（Beethoven）
export const BUNDLED_TRACK = {
  id: "local-debug-track",
  url: require("./assets/debug_track.mp3"),
  title: "Ludwig van Beethoven - Moonlight Sonata - Classical Remix",
  artist: "Beethoven (Pixabay Remix)",
};

// ② CDN の音源（Liszt / La Campanella）
export const CDN_TRACK = {
  id: "cdn-debug-track",
  url: CDN_URL,
  title: "Classical Piano by Franz Liszt, - Paganini Etude #3 (La Campanella)",
  artist: "Franz Liszt (Pixabay)",
};
```

---

## 5) 画面（操作UI）

### 5-1) `App.tsx`（新規 or 置き換え）

```tsx
// App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, View, Text, Button } from "react-native";
import TrackPlayer, { State, usePlaybackState } from "react-native-track-player";
import { setupPlayer, loadAndPlay } from "./player";
import { BUNDLED_TRACK, CDN_TRACK } from "./tracks";
import { SOURCE_MODE } from "./config";

export default function App() {
  const playback = usePlaybackState();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await setupPlayer();
      setReady(true);
    })();
  }, []);

  const stateLabel = (() => {
    switch (playback.state) {
      case State.Playing: return "Playing";
      case State.Paused: return "Paused";
      case State.Ready: return "Ready";
      default: return String(playback.state ?? "");
    }
  })();

  return (
    <SafeAreaView>
      <View style={{ padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "600" }}>Expo BGM Player</Text>
        <Text>Default Mode: {SOURCE_MODE} (ボタンで任意に検証可)</Text>
        <Text>Ready: {ready ? "yes" : "no"} / State: {stateLabel}</Text>

        {/* ① /assets の音源（Beethoven） */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "600" }}>
            ① Bundled (/assets): Beethoven - Moonlight Sonata
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <Button
              title="Load & Play (assets)"
              onPress={() => loadAndPlay(BUNDLED_TRACK)}
              disabled={!ready}
            />
          </View>
        </View>

        {/* ② CDN の音源（Liszt） */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontWeight: "600" }}>
            ② CDN: Liszt - Paganini Etude #3 (La Campanella)
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <Button
              title="Load & Play (CDN)"
              onPress={() => loadAndPlay(CDN_TRACK)}
              disabled={!ready}
            />
          </View>
        </View>

        {/* 共通制御 */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
          <Button title="Play" onPress={() => TrackPlayer.play()} />
          <Button title="Pause" onPress={() => TrackPlayer.pause()} />
          <Button title="Stop" onPress={() => TrackPlayer.stop()} />
        </View>
      </View>
    </SafeAreaView>
  );
}
```

---

## 6) 実行手順

### 6-1) まずは **/assets の音源** を再生（デフォルト：bundled）

```bash
# 設定反映（app.json変更後や初回のみ）
npx expo prebuild

# iOS 実機/シミュレータで起動（dev client）
npx expo run:ios

# 画面の「Load & Play (assets)」を押して再生を確認
# 画面ロック・他アプリ切替でも音が継続することを確認
```

> Android も行う場合：
>
> ```bash
> npx expo run:android
> ```

### 6-2) 次に **CDN の音源** を再生

（方法A：UI ボタンで「Load & Play (CDN)」を押すだけ → そのまま再生）

（方法B：起動モードも合わせて CDN にしたい場合は、環境変数で既定を切替）

```bash
# 開発用環境変数を設定（既にあれば追記でOK）
echo 'EXPO_PUBLIC_SOURCE_MODE=cdn' > .env.development
echo 'EXPO_PUBLIC_AUDIO_URL=https://cdn.pixabay.com/audio/2022/09/06/audio_12088c3510.mp3' >> .env.development

# 反映（必要に応じて）
npx expo prebuild

# 再起動
npx expo run:ios
```

* 画面の「Load & Play (CDN)」で Liszt（La Campanella）がストリーミング再生されることを確認。
* ネットワーク切断時の挙動・初回バッファなども合わせて評価。

---

## 7) 動作確認チェックリスト

* `/assets` 再生：

  * 機内モードでも再生できる（同梱バンドル）。
  * ロック画面コントロール（再生/一時停止）が効く。
* CDN 再生：

  * 初回バッファ後に再生開始。
  * ネット切断時のエラーハンドリング（ログ出力）を確認。
* 共通：

  * 画面オフ・他アプリ切替でも再生継続。
  * iOS: `UIBackgroundModes: audio` 効いている（必須）。
  * Android 14+: 通知にメディアコントロールが表示される。

---

## 8) コミット例（任意）

```bash
git add .
git commit -m "feat(audio): add bundled (Beethoven) and CDN (Liszt) playback with RN Track Player; background-ready"
```
