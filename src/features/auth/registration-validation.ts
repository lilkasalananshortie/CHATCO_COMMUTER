export const REGISTRATION_USERNAME_MAX_LENGTH = 16;
const REGISTRATION_USERNAME_PATTERN = /^[A-Za-z0-9._]+$/;

/** Format partial input without guessing or changing the date itself. */
export function formatRegistrationBirthdate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join("-");
}

export function registrationBirthdateError(value: string, now = new Date()): string | null {
  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return "Use a valid date in YYYY-MM-DD format.";

  const date = new Date(`${normalized}T00:00:00`);
  const validDate = date.getFullYear() === Number(match[1])
    && date.getMonth() + 1 === Number(match[2])
    && date.getDate() === Number(match[3]);
  if (!validDate) return "Use a valid date in YYYY-MM-DD format.";
  if (date >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) return "Your birthdate must be in the past.";
  return null;
}

/** Today's calendar date in the Philippines, which has no daylight saving. */
export function philippineToday(now = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** The PWD card's printed date. `after` is the current card date on a renewal. */
export function pwdValidUntilError(value: string, after?: string | null, now = new Date()): string | null {
  const normalized = value.trim();
  if (!normalized) return "Enter the valid-until date printed on your PWD ID.";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  const parsed = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!parsed || parsed.toISOString().slice(0, 10) !== normalized) return "Use a valid date in YYYY-MM-DD format.";
  const today = philippineToday(now);
  const renewing = !!after && after.slice(0, 10) >= today;
  if (normalized <= today || (renewing && normalized <= after!.slice(0, 10))) {
    return after ? "The new valid-until date must be later than your current card date and today." : "The valid-until date must be in the future.";
  }
  const maxYear = Number(today.slice(0, 4)) + 5;
  if (normalized > `${maxYear}-12-31`) return `Check the year. The date can be no later than Dec 31, ${maxYear}.`;
  return null;
}

export function registrationUsernameError(value: string): string | null {
  const username = value.trim();
  if (!username) return "Choose a username.";
  if (!REGISTRATION_USERNAME_PATTERN.test(username)) {
    return "Usernames can only use letters, numbers, periods (.) and underscores (_), with no spaces.";
  }
  if (username.length > REGISTRATION_USERNAME_MAX_LENGTH) {
    return `Usernames can be at most ${REGISTRATION_USERNAME_MAX_LENGTH} characters.`;
  }
  return null;
}
