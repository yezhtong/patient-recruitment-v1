import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(plain, salt, KEY_LEN);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
