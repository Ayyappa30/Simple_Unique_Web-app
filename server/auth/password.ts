import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  // Always do the same amount of work so unknown users aren't distinguishable by timing.
  const [scheme, saltHex, keyHex] = (stored ?? "scrypt$00$00").split("$");
  const salt = Buffer.from(saltHex ?? "", "hex");
  const expected = Buffer.from(keyHex ?? "", "hex");
  const actual = await scrypt(password, salt, KEY_LENGTH);
  return Boolean(stored) && scheme === "scrypt" && expected.length === actual.length && timingSafeEqual(expected, actual);
}
