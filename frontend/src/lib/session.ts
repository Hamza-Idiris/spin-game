const SESSION_TTL = 30 * 60 * 1000;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)));
export const newId = uuid;

function read(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function write(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage may be blocked */ } }

/** Anonymous browser id: random, never derived from anything about the person. NOT a unique-person identifier. */
export function getVisitorId(): string {
  let v = read('spin.vid'); if (!v) { v = uuid(); write('spin.vid', v); } return v;
}

/** Session id rotates after 30 minutes of inactivity. Returns whether a new session was created. */
export function getSession(touch = true): { id: string; isNew: boolean } {
  const now = Date.now();
  let id = read('spin.sid'); const last = Number(read('spin.last') ?? 0);
  let isNew = false;
  if (!id || now - last > SESSION_TTL) { id = uuid(); write('spin.sid', id); isNew = true; }
  if (touch) write('spin.last', String(now));
  return { id, isNew };
}
