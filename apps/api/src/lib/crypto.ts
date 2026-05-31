/**
 * AES-256-GCM encryption utility for storing integration secrets.
 * Key is read from ENCRYPTION_KEY env var (must be exactly 32 chars).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12  // GCM standard
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'telemantix-32-char-encryption-key'
  if (key.length < 32) {
    // Pad to 32 bytes if shorter (dev only — production must use full 32-char key)
    return Buffer.from(key.padEnd(32, '0').slice(0, 32))
  }
  return Buffer.from(key.slice(0, 32))
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Format: base64(iv + tag + ciphertext)
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const buf = Buffer.from(ciphertext, 'base64')

  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

export function maskSecret(value: string): string {
  if (value.length <= 8) return '••••••••'
  return value.slice(0, 4) + '••••••••' + value.slice(-4)
}
