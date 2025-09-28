# 指示書（codex用）

## 目的

* Expo + React Native で、iOS/Android どちらでも**バックグラウンド再生**できる最小アプリを用意する。
* Expo 開発用クライアント（development build）でチームに共有できる状態にする。

## 事前メモ（根拠）

* RN Track Player は **Expo 開発用クライアント**で利用可（Expo Go では不可）。iOS は `UIBackgroundModes: audio` 必須、Android は前景サービス（Android 14+ は種別 mediaPlayback 必須）。また RNTP は**再生サービスの登録**が必要。参照：RNTP公式ドキュメント／Expo Audioの背景再生要件／Android 14の前景サービス要件。 ([rntp.dev][1])

---

## 作業ステップ

### 1) プロジェクト作成（TypeScript）

```bash
# 新規（例: expo-bgm-player）
npx create-expo-app@latest expo-bgm-player -t
cd expo-bgm-player

# 必要パッケージ
npm i -D typescript @types/react @types/react-native
npm i react-native-track-player expo-dev-client
```

### 2) Expo 設定（app.json / app.config.ts）

* `app.json`（または `app.config.ts`）に以下を追加・統合する。

  * **iOS**: `UIBackgroundModes: ["audio"]`
  * **Android**: 前景サービス通知チャンネルと権限（`FOREGROUND_SERVICE_MEDIA_PLAYBACK` など）
  * **plugins** に RNTP を追加（AudioSession を playback に）

```json
{
  "expo": {
    "name": "expo-bgm-player",
    "slug": "expo-bgm-player",
    "scheme": "expobgm",
    "ios": {
      "supportsTablet": false,
      "infoPlist": {
        "UIBackgroundModes": ["audio"]
      }
    },
    "android": {
      "package": "com.example.expobgmplayer",
      "foregroundService": {
        "notificationChannelName": "Playback"
      },
      "permissions": [
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "WAKE_LOCK",
        "BLUETOOTH_CONNECT"
      ]
    },
    "plugins": [
      [
        "react-native-track-player",
        { "iosAudioSessionCategory": "playback" }
      ]
    ]
  }
}
```

* 注: RNTP は Expo の**開発用クライアント**が必要。Expo Go では動かない。 ([rntp.dev][1])

### 3) ネイティブコード生成（prebuild）と開発用クライアント作成

```bash
# ネイティブプロジェクト生成
npx expo prebuild

# iOS 開発用クライアントをローカルでビルド＆起動
npx expo run:ios

# Android も行う場合
# npx expo run:android
```

### 4) RNTP のサービス登録（index.js / index.ts）

* RNTP は**再生サービスの登録**が必須。`index.js`（または `index.ts`）を作成/編集。

`index.js`

```js
import { registerRootComponent } from 'expo';
import App from './App';
import TrackPlayer from 'react-native-track-player';

registerRootComponent(App);

// RNTP: 再生サービス登録（service.ts 参照）
TrackPlayer.registerPlaybackService(() => require('./service'));
```

（サービス登録は RNTP 公式推奨手順）([rntp.dev][2])

### 5) 再生サービス実装（service.ts）

`service.ts`

```ts
import TrackPlayer, {
  Event,
  RepeatMode,
  Capability,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';

module.exports = async function () {
  // キューやイベントの初期化はここで
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext().catch(() => {}));
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious().catch(() => {}));

  // Android: アプリKill後の挙動（必要に応じて）
  await TrackPlayer.updateOptions({
    stoppingAppPausesPlayback: false,
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    android: {
      appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.ContinuePlayback,
    },
  });

  await TrackPlayer.setRepeatMode(RepeatMode.Off);
};
```

### 6) アプリ本体（最小UIで再生可）

`App.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Button } from 'react-native';
import TrackPlayer, { State, Capability, Event, usePlaybackState } from 'react-native-track-player';

const STREAM = {
  id: '1',
  url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // 任意のMP3
  title: 'Sample',
  artist: 'Artist',
};

async function setupPlayer() {
  await TrackPlayer.setupPlayer();
  await TrackPlayer.updateOptions({
    capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
    compactCapabilities: [Capability.Play, Capability.Pause],
  });
  await TrackPlayer.reset();
  await TrackPlayer.add([STREAM]);
}

export default function App() {
  const playback = usePlaybackState();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await setupPlayer();
      setReady(true);
    })();

    const sub = TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
      console.warn('Playback error', e);
    });
    return () => sub.remove();
  }, []);

  const isPlaying = playback.state === State.Playing;

  return (
    <SafeAreaView>
      <View style={{ padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>Expo BGM Player</Text>
        <Text>Ready: {ready ? 'yes' : 'no'} / State: {State[playback.state || 0]}</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button title={isPlaying ? 'Pause' : 'Play'} onPress={() => (isPlaying ? TrackPlayer.pause() : TrackPlayer.play())} />
          <Button title="Stop" onPress={() => TrackPlayer.stop()} />
        </View>
      </View>
    </SafeAreaView>
  );
}
```

### 7) 実機検証ポイント

* **iOS**: 画面ロック／他アプリに切替えても再生が続くこと。ロック画面の再生コントロールが出ること。`UIBackgroundModes: audio` を入れていること。 ([docs.expo.dev][3])
* **Android**: 通知に再生コントロールが出ること。Android 14+ で前景サービス種別（mediaPlayback）が機能すること（RNTPプラグインがManifestへ注入）。 ([rntp.dev][1])

### 8) チーム共有（開発クライアント）

* **A案：QRでローカル配布**

  1. あなたのMacで `npx expo run:ios`（もしくは Android）を成功させる。
  2. `npx expo start --dev-client` で起動 → QR を共有 → 各メンバーは各自の端末で**開発用クライアント**をビルド（`expo run:ios/android`）して接続。
* **B案：EAS Build（推奨）**

  1. `npm i -D eas-cli` → `npx eas login`
  2. `npx eas build -p ios --profile development`（および `-p android`）
  3. 生成された dev client をチームに配布（TestFlight / .apk）。
     （Expoの“背景再生はスタンドアロン/開発用クライアントで”という要件に合致） ([docs.expo.dev][3])

---

## 動作が怪しいときのチェックリスト

* **Expo Goで試していないか？** → 動かない。**開発用クライアント**が必要。 ([Stack Overflow][4])
* **iOS**: `UIBackgroundModes` に `audio` が入っているか。ビルドし直したか。 ([docs.expo.dev][3])
* **Android 14+**: 前景サービス種別（`mediaPlayback`）がManifestに入っているか（プラグインが注入）。通知チャンネル名の設定有無。 ([rntp.dev][1])
* **RNTP サービス登録**を `index.js` でやっているか。`service.ts` が解決できるパスにあるか。 ([rntp.dev][2])

---

## 追加の発展（任意、別タスクで）

* MediaSessionメタデータ（タイトル/アート）の反映、ヘッドセット/BTボタン対応、プレイリスト/キュー、シーク、着信割り込みハンドリングなど（RNTP で対応可）。 ([GitHub][5])

---

### 完了条件（codex判定用）

1. `expo-bgm-player` がローカルで起動し、**実機**でバックグラウンド再生が継続する。
2. iOS ロック画面・Android 通知から再生/一時停止が操作できる。
3. チームが dev client をインストールし、`expo start --dev-client` のQRから起動できる。

---

[1]: https://rntp.dev/docs/3.1/basics/installation?utm_source=chatgpt.com "Installation"
[2]: https://rntp.dev/docs/basics/getting-started?utm_source=chatgpt.com "Getting Started | React Native Track Player"
[3]: https://docs.expo.dev/versions/latest/sdk/audio/?utm_source=chatgpt.com "Audio (expo-audio)"
[4]: https://stackoverflow.com/questions/77972949/how-can-i-implement-react-native-track-player-on-expo?utm_source=chatgpt.com "How can i implement React Native Track Player on Expo?"
[5]: https://github.com/doublesymmetry/react-native-track-player?utm_source=chatgpt.com "doublesymmetry/react-native-track-player"
