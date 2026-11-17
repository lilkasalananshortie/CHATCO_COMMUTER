export interface PhotoOffset { x: number; y: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampPhotoOffset(width: number, height: number, viewport: number, zoom: number, offset: PhotoOffset): PhotoOffset {
  const scale = viewport / Math.min(width, height) * zoom;
  return {
    x: clamp(offset.x, -(width * scale - viewport) / 2, (width * scale - viewport) / 2),
    y: clamp(offset.y, -(height * scale - viewport) / 2, (height * scale - viewport) / 2),
  };
}

export function photoCropRect(width: number, height: number, viewport: number, zoom: number, offset: PhotoOffset) {
  const scale = viewport / Math.min(width, height) * zoom;
  const bounded = clampPhotoOffset(width, height, viewport, zoom, offset);
  const size = Math.max(1, Math.min(width, height, Math.floor(viewport / scale)));
  return {
    originX: clamp(Math.round((width * scale - viewport) / (2 * scale) - bounded.x / scale), 0, width - size),
    originY: clamp(Math.round((height * scale - viewport) / (2 * scale) - bounded.y / scale), 0, height - size),
    width: size,
    height: size,
  };
}
