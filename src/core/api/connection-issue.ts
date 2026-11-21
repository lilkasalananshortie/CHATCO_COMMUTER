export type ConnectionIssue = "offline" | "server";

/** Separates a phone with no internet from a server that is not answering. */
export async function getConnectionIssue(): Promise<ConnectionIssue> {
  try {
    const Network = require("expo-network") as typeof import("expo-network");
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === false || state.isInternetReachable === false ? "offline" : "server";
  } catch {
    // Unknown: do not tell the commuter their own connection is the problem.
    return "server";
  }
}
