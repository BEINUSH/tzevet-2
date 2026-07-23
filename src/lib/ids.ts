import { customAlphabet } from "nanoid";

// Excludes visually-ambiguous characters (0/O, 1/I).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCodePart = customAlphabet(CODE_ALPHABET, 4);
const generateToken = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  24
);

export function generateJoinCode(): string {
  return generateCodePart();
}

export function generateDeviceToken(): string {
  return generateToken();
}

export function generateHostToken(): string {
  return generateToken();
}
