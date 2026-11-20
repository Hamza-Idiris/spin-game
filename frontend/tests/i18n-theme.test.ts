import { beforeEach, describe, expect, it } from 'vitest';
import i18n, { setLanguage } from '../src/lib/i18n';
import { applyTheme, hexToRgbTriplet, saveTheme, savedTheme } from '../src/lib/theme';
import en from '../src/locales/en.json';
import so from '../src/locales/so.json';

const keys = (o: Record<string, unknown>, p = ''): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));

describe('language', () => {
  it('Somali has every English key (no untranslated UI)', () => { const so_ = new Set(keys(so)); expect(keys(en).filter((k) => !so_.has(k))).toEqual([]); });
  it('switches language and persists the choice', () => {
    setLanguage('so'); expect(i18n.t('nav.home')).toBe('Bogga Hore'); expect(localStorage.getItem('spin.lang')).toBe('so');
    setLanguage('en'); expect(i18n.t('nav.home')).toBe('Home');
  });
  it('interpolates and pluralises', () => { expect(i18n.t('input.count', { count: 1 })).toBe('1 participant'); expect(i18n.t('input.count', { count: 3 })).toBe('3 participants'); });
});

describe('theme', () => {
  beforeEach(() => document.documentElement.classList.remove('dark'));
  it('toggles the dark class and stores the preference', () => {
    applyTheme('dark', false); expect(document.documentElement.classList.contains('dark')).toBe(true);
    saveTheme('dark'); expect(savedTheme()).toBe('dark');
    applyTheme('light', false); expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
  it('converts accent hex to an rgb triplet and rejects invalid input', () => { expect(hexToRgbTriplet('#6C5CE7')).toBe('108 92 231'); expect(hexToRgbTriplet('red')).toBeNull(); });
});
