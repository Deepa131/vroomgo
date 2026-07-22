const crypto = require("crypto");
const { PHONE_ENC_KEY } = require("../config");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended IV length for GCM

// PHONE_ENC_KEY must be a 64-char hex string (32 bytes) set in .env.
const getKey = () => {
  if (!PHONE_ENC_KEY || PHONE_ENC_KEY.length !== 64) {
    throw new Error("PHONE_ENC_KEY must be a 64-character hex string (32 bytes) in .env");
  }
  return Buffer.from(PHONE_ENC_KEY, "hex");
};

// Stored format: "<iv-hex>:<authTag-hex>:<ciphertext-hex>"
const isEncrypted = (value) => typeof value === "string" && /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(value);

const encrypt = (plainText) => {
  if (!plainText) return plainText;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
};

const decrypt = (payload) => {
  if (!payload || !isEncrypted(payload)) return payload;
  const [ivHex, authTagHex, ciphertextHex] = payload.split(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
};

module.exports = { encrypt, decrypt, isEncrypted };
