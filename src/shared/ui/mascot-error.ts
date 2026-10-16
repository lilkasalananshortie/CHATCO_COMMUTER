export function getMascotErrorState(error: unknown) {
  const value = error as { name?: string; status?: number; response?: { status?: number } } | null;
  const status = value?.status ?? value?.response?.status;
  if (value?.name === "NetworkError" || value?.name === "AbortError") {
    return {
      pose: "offline" as const,
      title: "Connection interrupted",
      message: "We couldn't reach ChatCo. Check your connection and try again.",
    };
  }
  if (status === 404) {
    return {
      pose: "not-found" as const,
      title: "We couldn't find that",
      message: "This content isn't available right now. Please try again.",
    };
  }
  return {
    pose: "not-found" as const,
    title: "Something went wrong",
    message: "We couldn't load this right now. Please try again.",
  };
}

/** Validation/account errors keep their precise form messages, not a crash illustration. */
export function shouldIllustrateError(error: unknown): boolean {
  const value = error as { name?: string; status?: number; response?: { status?: number } } | null;
  const status = value?.status ?? value?.response?.status;
  return value?.name === "NetworkError" || value?.name === "AbortError" || status === 404 || (status !== undefined && status >= 500);
}
