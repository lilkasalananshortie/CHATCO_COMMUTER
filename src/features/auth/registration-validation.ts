export const REGISTRATION_USERNAME_MAX_LENGTH = 16;
const REGISTRATION_USERNAME_PATTERN = /^[A-Za-z0-9._]+$/;

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
