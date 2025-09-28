import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
} from 'react-native-track-player';

export default async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext().catch(() => undefined);
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious().catch(() => undefined);
  });

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
      appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.ContinuePlayback,
    },
  });

  await TrackPlayer.setRepeatMode(RepeatMode.Off);
}
