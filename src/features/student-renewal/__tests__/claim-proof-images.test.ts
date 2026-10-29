/// <reference types="jest" />
import * as ImagePicker from "expo-image-picker";
import { pickClaimProofImages } from "../../lostfound/claim-proof-images";

jest.mock("expo-image-picker", () => ({ MediaTypeOptions: { Images: "images" }, launchImageLibraryAsync: jest.fn() }));
const pick = ImagePicker.launchImageLibraryAsync as jest.Mock;
beforeEach(() => jest.resetAllMocks());

test("proof picker respects the remaining three-photo limit", async () => {
  pick.mockResolvedValue({ canceled: false, assets: [{ uri: "file://proof.png", fileName: "proof.png", mimeType: "image/png", fileSize: 1024 }] });
  await expect(pickClaimProofImages(1)).resolves.toMatchObject([{ uri: "file://proof.png", name: "proof.png", type: "image/png", size: 1024 }]);
  expect(pick).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 2 }));
});

test("oversized and unsupported proof images are rejected before upload", async () => {
  pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri: "file://large.jpg", mimeType: "image/jpeg", fileSize: 5 * 1024 * 1024 + 1 }] });
  await expect(pickClaimProofImages(0)).rejects.toThrow("5MB");
  pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri: "file://bad.gif", mimeType: "image/gif" }] });
  await expect(pickClaimProofImages(0)).rejects.toThrow("JPG, PNG or WebP");
});

test("proof picker does not open when three photos are already attached", async () => {
  await expect(pickClaimProofImages(3)).rejects.toThrow("up to 3");
  expect(pick).not.toHaveBeenCalled();
});
