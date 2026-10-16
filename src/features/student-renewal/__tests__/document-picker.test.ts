/// <reference types="jest" />
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
import { getDocumentAsync } from "expo-document-picker";
import { pickRenewalDocument } from "../pick-renewal-document";
beforeEach(() => jest.resetAllMocks());
test("Android can select a PDF and preserves file metadata for multipart upload", async () => {
  (getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: "file:///proof.pdf", name: "proof.pdf", mimeType: "application/pdf", size: 2048 }] });
  expect(await pickRenewalDocument()).toEqual({ uri: "file:///proof.pdf", name: "proof.pdf", type: "application/pdf", size: 2048 });
  expect(getDocumentAsync).toHaveBeenCalledWith(expect.objectContaining({ multiple: false, copyToCacheDirectory: true, type: expect.arrayContaining(["application/pdf"]) }));
});
test("cancelling native picker returns no replacement file", async () => {
  (getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });
  expect(await pickRenewalDocument()).toBeNull();
});
test("unknown file type cannot masquerade as JPEG", async () => {
  (getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: "file:///unknown", name: "unknown" }] });
  await expect(pickRenewalDocument()).rejects.toThrow("could not be identified");
});
test("picker failures propagate so the form can show a retryable error", async () => {
  (getDocumentAsync as jest.Mock).mockRejectedValue(new Error("Picker unavailable"));
  await expect(pickRenewalDocument()).rejects.toThrow("Picker unavailable");
});
