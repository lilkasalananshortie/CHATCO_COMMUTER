export type RecoveryStep = "email" | "code" | "password" | "done";

export function validateRecovery(step: RecoveryStep, input: {
  email: string; code: string; password: string; confirmation: string;
}): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return "Enter your registered email address.";
  if (step === "code" && !/^\d{6}$/.test(input.code)) return "Enter the 6-digit code from your email.";
  if (step === "password") {
    // Mirrors Laravel StrongPassword; the server revalidates the code and password.
    if (Array.from(input.password).length < 8 || Array.from(input.password).length > 128 || !/[A-Z]/.test(input.password) || !/[0-9]/.test(input.password) || !/[^A-Za-z0-9\s]/.test(input.password)) {
      return "Use 8–128 characters with an uppercase letter, a number, and a symbol.";
    }
    if (input.password !== input.confirmation) return "Passwords do not match.";
  }
  return null;
}
