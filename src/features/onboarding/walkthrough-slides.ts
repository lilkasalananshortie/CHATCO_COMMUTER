import type { MascotPose } from "../../shared/ui/Mascot";

interface WalkthroughSlide {
  id: number;
  tag: string;
  title: string;
  description: string;
  pose: MascotPose;
  mascotLabel: string;
  accent: string;
  background: string;
}

// Keep all five walkthrough steps, with copy matching available features.
export const WALKTHROUGH_SLIDES: readonly WalkthroughSlide[] = [
  {
    "id": 0,
    "tag": "",
    "accent": "#1A5FB4",
    "title": "Welcome aboard!",
    "description": "Your everyday commute, made simpler. Let's get you started with ChatCo.",
    "pose": "greeting",
    "background": "#071725",
    "mascotLabel": "ChatCo mascot waving to welcome you aboard"
  },
  {
    "id": 1,
    "tag": "REAL-TIME FLEET",
    "accent": "#1A5FB4",
    "title": "Fleet Radar",
    "description": "Track approaching modern jeeps on the live map.",
    "pose": "fleet-action",
    "background": "#081B2D",
    "mascotLabel": "ChatCo mascot using its map and pointing toward an approaching jeep"
  },
  {
    "id": 2,
    "tag": "CASHLESS REWARDS",
    "accent": "#10B981",
    "title": "Cashless Perks",
    "description": "Scan to pay with GCash. Earn rewards as you ride.",
    "pose": "scan-action",
    "background": "#08201E",
    "mascotLabel": "ChatCo mascot using its phone to scan and pay"
  },
  {
    "id": 3,
    "tag": "COMMUTER SAFETY",
    "accent": "#DC2626",
    "title": "Trip Guardian",
    "description": "Share your route so commuters can follow your journey.",
    "pose": "guardian-action",
    "background": "#231522",
    "mascotLabel": "ChatCo mascot holding a shield to keep your trip safe"
  },
  {
    "id": 4,
    "tag": "COOPERATIVE VAULT",
    "accent": "#7C3AED",
    "title": "Coop Vault",
    "description": "Find recovered belongings and claim them with proof.",
    "pose": "vault-action",
    "background": "#19152C",
    "mascotLabel": "ChatCo mascot using a magnifying glass to find recovered belongings"
  }
];
