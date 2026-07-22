// At least 8 chars, one lowercase, one uppercase, one digit, one symbol.
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const isStrongPassword = (password) => STRONG_PASSWORD_REGEX.test(password || "");

const passwordPolicyMessage =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol";

module.exports = { isStrongPassword, passwordPolicyMessage };



