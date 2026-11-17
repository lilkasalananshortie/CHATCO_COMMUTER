/// <reference types="jest" />
import { ImageManipulator } from "expo-image-manipulator";
import { renderProfilePhotoCrop } from "../profile-photo-processing";

jest.mock("expo-image-manipulator", () => ({ ImageManipulator: { manipulate: jest.fn() } }));

const renderAsync = jest.fn(async () => ({ uri: "file:///square.jpg" }));
const resize = jest.fn();
const crop = jest.fn();
const context = { crop, resize, renderAsync };

beforeEach(() => {
  jest.clearAllMocks();
  crop.mockReturnValue(context);
  resize.mockReturnValue(context);
  (ImageManipulator.manipulate as jest.Mock).mockReturnValue(context);
});

test("small square crops keep their size without a resize pass", async () => {
  const rect = { originX: 50, originY: 0, width: 600, height: 600 };
  await renderProfilePhotoCrop("file:///source.jpg", rect);
  expect(crop).toHaveBeenCalledWith(rect);
  expect(resize).not.toHaveBeenCalled();
  expect(renderAsync).toHaveBeenCalledTimes(1);
});

test("large square crops resize by width without passing a zero web height", async () => {
  await renderProfilePhotoCrop("file:///source.jpg", { originX: 0, originY: 0, width: 1600, height: 1600 });
  expect(resize).toHaveBeenCalledWith({ width: 1024 });
  expect(renderAsync).toHaveBeenCalledTimes(1);
});
