import React, { useEffect, useState } from 'react';
import { Button, SafeAreaView, Text, View } from 'react-native';
import TrackPlayer, { Event, IOSCategory, State, Track, usePlaybackState } from 'react-native-track-player';

const STREAM: Track = {
  id: '1',
  url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  title: 'Sample',
  artist: 'SoundHelix',
  artwork: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.jpg',
};

async function setupPlayer() {
  try {
    await TrackPlayer.setupPlayer({
      iosCategory: IOSCategory.Playback,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `${error}`;
    if (!message.includes('already')) {
      throw error;
    }
  }
  await TrackPlayer.reset();
  await TrackPlayer.add([STREAM]);
}

export default function App() {
  const playback = usePlaybackState();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await setupPlayer();
        if (mounted) {
          setReady(true);
        }
      } catch (error) {
        console.warn('Failed to initialize player', error);
      }
    })();

    const errorSub = TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
      console.warn('Playback error', event);
    });

    return () => {
      mounted = false;
      errorSub.remove();
    };
  }, []);

  const playbackState = playback.state ?? State.None;
  const isPlaying = playbackState === State.Playing;

  return (
    <SafeAreaView>
      <View style={{ padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>Expo BGM Player</Text>
        <Text>Ready: {ready ? 'yes' : 'no'} / State: {playbackState}</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            title={isPlaying ? 'Pause' : 'Play'}
            onPress={() => (isPlaying ? TrackPlayer.pause() : TrackPlayer.play())}
            disabled={!ready}
          />
          <Button title="Stop" onPress={() => TrackPlayer.stop()} disabled={!ready} />
        </View>
      </View>
    </SafeAreaView>
  );
}
