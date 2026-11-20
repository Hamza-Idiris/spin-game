// Backup integrity + encryption helpers (WebCrypto only; runs in Deno and Node 20+).
const MAGIC = new TextEncoder().encode('SPINENC1');
const bs = (u: Uint8Array) => u as unknown as BufferSource; // TS 5.7+ typed-array generics

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bs(data));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function importKey(b64Key: string): Promise<CryptoKey> {
  const raw = b64ToBytes(b64Key);
  if (raw.length !== 32) throw new Error('BACKUP_ENCRYPTION_KEY must be 32 bytes, base64 encoded');
  return crypto.subtle.importKey('raw', bs(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptBytes(plain: Uint8Array, b64Key: string): Promise<Uint8Array> {
  const key = await importKey(b64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv) }, key, bs(plain)));
  const out = new Uint8Array(MAGIC.length + 12 + ct.length);
  out.set(MAGIC, 0); out.set(iv, MAGIC.length); out.set(ct, MAGIC.length + 12);
  return out;
}

export function isEncrypted(data: Uint8Array): boolean {
  return MAGIC.every((b, i) => data[i] === b);
}

export async function decryptBytes(data: Uint8Array, b64Key: string): Promise<Uint8Array> {
  if (!isEncrypted(data)) throw new Error('Not an encrypted SPIN backup');
  const key = await importKey(b64Key);
  const iv = data.slice(MAGIC.length, MAGIC.length + 12);
  const ct = data.slice(MAGIC.length + 12);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(iv) }, key, bs(ct)));
}
