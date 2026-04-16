/** Shared rules for register + client hints (no Node-only APIs). */

export const PASSWORD_RULES_TEXT =
  "At least 8 characters, including uppercase, lowercase, a number, and a symbol (e.g. ! @ #).";

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one symbol (non letter or number).";
  }
  return null;
}
