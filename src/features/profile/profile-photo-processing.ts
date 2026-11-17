import { ImageManipulator } from "expo-image-manipulator";

interface SquareCrop {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export function renderProfilePhotoCrop(uri: string, crop: SquareCrop) {
  const context = ImageManipulator.manipulate(uri).crop(crop);
  if (crop.width > 1024) context.resize({ width: 1024 });
  return context.renderAsync();
}
