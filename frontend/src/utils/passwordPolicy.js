// Mirrors the server-side rule in backend/src/utils/passwordPolicy.js:
// at least 8 chars, one lowercase, one uppercase, one digit, one symbol.
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function isStrongPassword(password) {
  return STRONG_PASSWORD_REGEX.test(password || "");
}

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol";

// Returns { score: 0-4, label } for a live strength meter.
export function getPasswordStrength(password) {
  const value = password || "";
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] };
}
