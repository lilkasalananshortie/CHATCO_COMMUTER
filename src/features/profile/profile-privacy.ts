/** Same shoulder-surfing protection as web; never alters the saved address. */
export function maskedEmail(email?: string | null): string {
  if (!email) return "—";
  const separator = email.indexOf("@");
  if (separator < 1) return "••••";
  return `${email.slice(0, 1)}••••${email.slice(separator)}`;
}
