import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/lib/i18n';
import i18n, { setLanguage } from '../src/lib/i18n';
import { SettingsProvider } from '../src/hooks/useSettings';
import { ToastProvider } from '../src/hooks/useToast';
import GroupGenerator from '../src/features/group-generator/GroupGenerator';
import TeamMatching from '../src/features/team-matching/TeamMatching';
import RandomSelection from '../src/features/random-selection/RandomSelection';
import Home from '../src/pages/public/Home';
import { ThemeToggle } from '../src/components/ThemeToggle';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root; let box: HTMLDivElement;
const mount = async (el: React.ReactElement) => { await act(async () => { root.render(<MemoryRouter><SettingsProvider><ToastProvider>{el}</ToastProvider></SettingsProvider></MemoryRouter>); }); await act(async () => { await new Promise((r) => setTimeout(r, 20)); }); };
const type = async (ta: HTMLTextAreaElement, v: string) => { await act(async () => { const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!; set.call(ta, v); ta.dispatchEvent(new Event('input', { bubbles: true })); }); };
const click = async (el: Element) => { await act(async () => { (el as HTMLElement).click(); }); await act(async () => { await new Promise((r) => setTimeout(r, 30)); }); };
const btn = (label: RegExp) => [...box.querySelectorAll('button')].find((b) => label.test(b.textContent ?? ''))!;

beforeEach(() => { localStorage.clear(); box = document.createElement('div'); document.body.appendChild(box); root = createRoot(box); setLanguage('en'); });
afterEach(async () => { await act(async () => root.unmount()); box.remove(); });

describe('end-to-end UI flows (jsdom)', () => {
  it('Group Generator: paste names, remove duplicates with feedback, generate even groups', async () => {
    await mount(<GroupGenerator />);
    const ta = box.querySelector('textarea')!;
    await type(ta, 'Ann\nBob\nann\nCy\nDi\nEd\nFay\nGus\nHal\nIvy\nJo');   // 'ann' duplicates 'Ann'
    await click(btn(/add names/i));
    expect(box.textContent).toContain('10 participants');
    await click(btn(/generate groups/i));
    const cards = box.querySelectorAll('h3');
    expect(cards.length).toBe(3);                                          // 10 people, size 4 -> 3 groups (4/3/3)
    const names = [...box.querySelectorAll('li')].map((l) => l.textContent);
    expect(new Set(names).size).toBe(10);
  });
  it('Team Matching: odd teams produce a BYE', async () => {
    await mount(<TeamMatching />);
    await type(box.querySelector('textarea')!, 'A\nB\nC\nD\nE');
    await click(btn(/add names/i)); await click(btn(/match teams/i));
    expect(box.textContent).toContain('BYE');
  });
  it('Random Selection: picks the requested number of distinct winners', async () => {
    await mount(<RandomSelection />);
    await type(box.querySelector('textarea')!, 'A\nB\nC\nD\nE\nF');
    await click(btn(/add names/i));
    const count = box.querySelector('#sc') as HTMLInputElement;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(count, '3'); count.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { btn(/^select$/i).click(); await new Promise((r) => setTimeout(r, 2200)); });
    expect(box.querySelectorAll('.card .text-lg.font-extrabold').length).toBe(3);
  }, 10000);
  it('Home renders the headline in English and Somali; theme toggle flips the dark class', async () => {
    await mount(<><Home /><ThemeToggle /></>);
    expect(box.textContent).toContain('Make Every Choice Random.');
    expect(box.querySelectorAll('a[href^="/tools/"]').length).toBe(5);
    await act(async () => { await i18n.changeLanguage('so'); });
    expect(box.textContent).toContain('Ka dhig doorasho kasta mid random ah.');
    await act(async () => { await i18n.changeLanguage('en'); });
    const before = document.documentElement.classList.contains('dark');
    await click(box.querySelector('button[aria-label^="Theme"]')!);
    expect(document.documentElement.classList.contains('dark')).toBe(!before);
  });
});
