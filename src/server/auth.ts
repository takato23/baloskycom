import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${HASH_PREFIX}:${salt}:${hash}`;
};

export const verifyPassword = (password: string, passwordHash?: string | null) => {
  if (!passwordHash) return false;

  const [prefix, salt, storedHash] = passwordHash.split(':');
  if (prefix !== HASH_PREFIX || !salt || !storedHash) {
    return false;
  }

  const derivedHash = scryptSync(password, salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (storedBuffer.length !== derivedHash.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedHash);
};
