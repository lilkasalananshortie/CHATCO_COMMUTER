import type { AudioPlayer } from "expo-audio";

type DashboardSound = "hail" | "nearby" | "accepted";

const sources: Record<DashboardSound, number> = {
  hail: require("../../../assets/sounds/hail-reminder.wav"),
  nearby: require("../../../assets/sounds/jeep-nearby.wav"),
  accepted: require("../../../assets/sounds/hail-accepted.wav"),
};

const players = new Map<DashboardSound, AudioPlayer>();
let loading: Promise<void> | null = null;

/** Keep the short cues loaded so a GPS update or hail response can play promptly. */
export function preloadDashboardSounds(): Promise<void> {
  loading ??= import("expo-audio")
    .then(({ createAudioPlayer }) => {
      for (const name of Object.keys(sources) as DashboardSound[]) {
        if (!players.has(name)) players.set(name, createAudioPlayer(sources[name]));
      }
    })
    .catch(() => {
      loading = null;
    });
  return loading;
}

export async function playDashboardSound(name: DashboardSound): Promise<void> {
  await preloadDashboardSounds();
  const player = players.get(name);
  if (!player) return;
  try {
    await player.seekTo(0);
    player.play();
  } catch {
    // Keep GPS tracking and hail state updates usable if device audio fails.
  }
}
