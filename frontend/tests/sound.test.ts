import { afterEach, describe, expect, it } from 'vitest';
import { sound } from '../src/lib/sound';

describe('sound volume', () => {
  afterEach(() => { localStorage.removeItem('spin.volume'); sound.setLevel(7); });

  it('clamps plus and minus between 0 and 10 and persists', () => {
    sound.setLevel(1);
    expect(sound.quieter()).toBe(0);
    expect(sound.quieter()).toBe(0);
    sound.setLevel(9);
    expect(sound.louder()).toBe(10);
    expect(sound.louder()).toBe(10);
    expect(localStorage.getItem('spin.volume')).toBe('10');
  });
});
