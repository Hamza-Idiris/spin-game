import { describe, expect, it } from 'vitest';
import { decryptBytes, encryptBytes, isEncrypted, sha256Hex } from '../../supabase/functions/_shared/backupcrypto';
import { validateSetting } from '../../supabase/functions/_shared/settings';

const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const data = new TextEncoder().encode(JSON.stringify({ hello: 'world', n: [1, 2, 3] }));

describe('backup integrity & encryption', () => {
  it('sha256 is deterministic and detects tampering', async () => {
    const h = await sha256Hex(data); expect(h).toHaveLength(64); expect(await sha256Hex(data)).toBe(h);
    const bad = new Uint8Array(data); bad[0] ^= 1; expect(await sha256Hex(bad)).not.toBe(h);
  });
  it('AES-GCM round-trips and marks the file as encrypted', async () => {
    const enc = await encryptBytes(data, key); expect(isEncrypted(enc)).toBe(true); expect(isEncrypted(data)).toBe(false);
    expect(Array.from(await decryptBytes(enc, key))).toEqual(Array.from(data));
  });
  it('fails on wrong key or corrupted ciphertext (corrupted backups never decrypt)', async () => {
    const enc = await encryptBytes(data, key); const other = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    await expect(decryptBytes(enc, other)).rejects.toThrow();
    const bad = new Uint8Array(enc); bad[bad.length - 1] ^= 1; await expect(decryptBytes(bad, key)).rejects.toThrow();
  });
  it('rejects keys of the wrong length', async () => { await expect(encryptBytes(data, btoa('short'))).rejects.toThrow(); });
});

describe('backend settings validation (admin-api)', () => {
  const ok = { maintenance: false, activityRetentionDays: 365, sessionRetentionDays: 365, resultsRetentionDays: 0, maxParticipants: 500, maxNameLength: 80 };
  it('accepts valid settings', () => { expect(validateSetting('system', ok)).toBeNull(); });
  it('rejects unknown keys/fields, bad ranges and non-https logos', () => {
    expect(validateSetting('nope', {})).toBe('unknown_key');
    expect(validateSetting('system', { ...ok, extra: 1 })).toMatch(/unknown_field/);
    expect(validateSetting('system', { ...ok, maxParticipants: 999999 })).toMatch(/invalid_field/);
    expect(validateSetting('general', { name: 'x', logoUrl: 'javascript:alert(1)', faviconUrl: '', description: '', headline: 'h', subtitle: '' })).toMatch(/logoUrl/);
  });
  it('requires at least one theme to be allowed', () => { expect(validateSetting('appearance', { defaultTheme: 'system', allowLight: false, allowDark: false, primaryColor: '#6C5CE7' })).toMatch(/allowLight/); });
});
