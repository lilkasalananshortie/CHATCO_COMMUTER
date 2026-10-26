/// <reference types="jest" />
import { Alert, Linking } from "react-native";
import { LEGAL_LINKS, openLegalLink } from "../legal-links";
jest.mock("react-native", () => ({ Alert: { alert: jest.fn() }, Linking: { openURL: jest.fn() } }));
beforeEach(() => jest.resetAllMocks());
test.each(["privacy", "terms", "support"] as const)("opens the canonical %s destination", async kind => {
  await openLegalLink(kind);
  expect(Linking.openURL).toHaveBeenCalledWith(LEGAL_LINKS[kind]);
  expect(Alert.alert).not.toHaveBeenCalled();
});
test("privacy uses the web route, not the missing privacy alias", () => {
  expect(LEGAL_LINKS.privacy).toBe("https://chatco.online/privacy-policy");
});
test.each(["privacy", "support"] as const)("%s failure is actionable and never an unhandled promise", async kind => {
  (Linking.openURL as jest.Mock).mockRejectedValue(new Error("No handler"));
  await expect(openLegalLink(kind)).resolves.toBeUndefined();
  expect(Alert.alert).toHaveBeenCalledWith("Unable to open link", expect.stringContaining(kind === "support" ? "eric.chatco@gmail.com" : LEGAL_LINKS.privacy));
});
