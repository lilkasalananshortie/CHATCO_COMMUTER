// Reserve real layout space: an absolutely positioned image cannot size its parent.
export function getMascotSize(requested: number, width: number, height: number) {
  return Math.max(1, Math.floor(Math.min(requested, Math.max(1, width - 48), Math.max(1, height * 0.24))));
}

// Leave room for a 16px halo, page padding, copy and persistent navigation.
// Larger accessibility text gets more space rather than shrinking the text.
export function getWalkthroughMascotSize(width: number, height: number, fontScale = 1) {
  return Math.max(1, Math.floor(Math.min(280, width - 80, height * 0.36 / Math.max(1, fontScale))));
}
