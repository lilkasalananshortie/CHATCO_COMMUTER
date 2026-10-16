/// <reference types="jest" />
import { useWindowDimensions } from "react-native";
import { Mascot, type MascotPose } from "../Mascot";

jest.mock("react-native", () => ({
  Image: "Image",
  View: "View",
  StyleSheet: { create: (styles: unknown) => styles },
  useWindowDimensions: jest.fn(),
}));
jest.mock("../../../../assets/mascot/mascot-greeting.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-phone.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-envelope.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-key.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-reward.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-thanks.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-noticeboard.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-offline.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-not-found.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-fleet-action.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-scan-action.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-guardian-action.png", () => 1);
jest.mock("../../../../assets/mascot/mascot-vault-action.png", () => 1);

beforeEach(() => {
  jest.mocked(useWindowDimensions).mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });
});

describe("mascot frame visibility", () => {
  test.each(["greeting", "fleet-action", "scan-action", "guardian-action", "vault-action"] as MascotPose[])(
    "%s has explicit dimensions without a percentage-width feedback loop",
    (pose) => {
      const frame = Mascot({ pose, size: 240, responsive: false });
      const style = Object.assign({}, ...frame.props.style);
      expect(style.width).toBe(240);
      expect(style.height).toBe(240);
      expect(style.maxWidth).toBeUndefined();
      expect(style.flexShrink).toBe(0);
      expect(frame.props.onLayout).toBeUndefined();
      expect(frame.props.children.props.source).toBe(1);
    },
  );

  test("regular mascot remains bounded on a narrow phone", () => {
    jest.mocked(useWindowDimensions).mockReturnValue({ width: 280, height: 480, scale: 1, fontScale: 1 });
    const frame = Mascot({ pose: "phone", size: 280 });
    const style = Object.assign({}, ...frame.props.style);
    expect(style.width).toBe(115);
    expect(style.height).toBe(115);
  });
});
