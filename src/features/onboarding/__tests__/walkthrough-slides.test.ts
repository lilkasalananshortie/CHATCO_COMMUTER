/// <reference types="jest" />
import { WALKTHROUGH_SLIDES } from "../walkthrough-slides";

describe("mascot walkthrough content", () => {
  test("retains all five slides in their original order", () => {
    expect(WALKTHROUGH_SLIDES.map((slide) => slide.title)).toEqual([
      "Welcome aboard!", "Fleet Radar", "Cashless Perks", "Trip Guardian", "Coop Vault",
    ]);
  });

  test.each([
    [0, "Your everyday commute, made simpler. Let's get you started with ChatCo.", "greeting"],
    [1, "Track approaching modern jeeps on the live map.", "fleet-action"],
    [2, "Scan to pay with GCash. Earn rewards as you ride.", "scan-action"],
    [3, "Share your route so commuters can follow your journey.", "guardian-action"],
    [4, "Find recovered belongings and claim them with proof.", "vault-action"],
  ])("keeps slide %s's exact description and matching pose", (index, description, pose) => {
    const slide = WALKTHROUGH_SLIDES[Number(index)]!;
    expect(slide.description).toBe(description);
    expect(slide.pose).toBe(pose);
    expect(slide.mascotLabel.length).toBeGreaterThan(0);
    expect(slide.accent).toMatch(/^#[\da-f]{6}$/i);
    expect(slide.background).toMatch(/^#[\da-f]{6}$/i);
  });
});
