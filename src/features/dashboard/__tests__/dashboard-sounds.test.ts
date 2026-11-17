/// <reference types="jest" />
import { playDashboardSound, preloadDashboardSounds } from "../dashboard-sounds";

jest.mock("../../../../assets/sounds/hail-reminder.wav", () => 1);
jest.mock("../../../../assets/sounds/jeep-nearby.wav", () => 2);

const players: Array<{ seekTo: jest.Mock; play: jest.Mock }> = [];
jest.mock("expo-audio", () => ({
  createAudioPlayer: () => {
    const player = { seekTo: jest.fn().mockResolvedValue(undefined), play: jest.fn() };
    players.push(player);
    return player;
  },
}));

test("dashboard cues preload once and restart their player for each trigger", async () => {
  await preloadDashboardSounds();
  await playDashboardSound("hail");
  await playDashboardSound("hail");
  await playDashboardSound("nearby");

  expect(players).toHaveLength(2);
  expect(players[0]!.seekTo).toHaveBeenCalledTimes(2);
  expect(players[0]!.seekTo).toHaveBeenCalledWith(0);
  expect(players[0]!.play).toHaveBeenCalledTimes(2);
  expect(players[1]!.play).toHaveBeenCalledTimes(1);
});
