// Nepali mobile numbers: 10 digits, starting with 96, 97, or 98
export const NEPALI_PHONE_REGEX = /^(96|97|98)\d{8}$/;

export function isValidNepaliPhone(phone) {
  return NEPALI_PHONE_REGEX.test((phone || "").trim());
}

export function getPhoneError(phone) {
  const value = (phone || "").trim();
  if (!value) return "Phone number is required";
  if (!isValidNepaliPhone(value)) {
    return "Invalid phone number format. Must be 10 digits starting with 96, 97, or 98";
  }
  return "";
}