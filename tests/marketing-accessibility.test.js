import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { createDialog } from '../scripts/dialog.js';
import { initProductPreview } from '../scripts/product-preview.js';

vi.mock('../scripts/main.js', () => ({ launchConfetti: vi.fn() }));
vi.mock('../scripts/convex.js', () => ({
  submitMessage: vi.fn(), getMessagesByEmail: vi.fn().mockResolvedValue([]),
  getSuggestions: vi.fn().mockResolvedValue([]), seedSuggestions: vi.fn(),
  submitSuggestion: vi.fn(), voteSuggestion: vi.fn(),
}));
vi.mock('@clerk/clerk-js', () => ({ Clerk: vi.fn() }));
import { initFAQBubble } from '../scripts/faq-bubble.js';
import { submitMessage } from '../scripts/convex.js';

const home = readFileSync('index.html', 'utf8');
const listeners = [];
beforeEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  sessionStorage.clear();
  // Each fixture is a page navigation; remove its document/window handlers after it.
  for (const target of [window, document]) {
    const original = target.addEventListener.bind(target);
    vi.spyOn(target, 'addEventListener').mockImplementation((...args) => {
      listeners.push([target, ...args]);
      return original(...args);
    });
  }
});
afterEach(() => {
  for (const [target, ...args] of listeners.splice(0)) target.removeEventListener(...args);
  vi.unstubAllGlobals();
});

describe('Help Center', () => {
  function openHelp() {
    document.body.innerHTML = '<main><a href="/">Home</a></main>';
    initFAQBubble();
    const trigger = document.querySelector('.faq-bubble-trigger');
    trigger.focus();
    trigger.click();
    return trigger;
  }

  it('hides closed controls, traps keyboard focus, and restores focus on Escape', () => {
    const trigger = openHelp();
    const panel = document.querySelector('#faq-bubble-panel');
    const close = panel.querySelector('.faq-bubble-close');
    expect(document.activeElement).toBe(close);
    expect(document.querySelector('main').hasAttribute('inert')).toBe(true);
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe([...panel.querySelectorAll('.faq-bubble-question')].at(-1));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.activeElement).toBe(trigger);
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('main').hasAttribute('inert')).toBe(false);
  });

  it('announces FAQ expansion and provides accessible names for every field', async () => {
    openHelp();
    const question = document.querySelector('.faq-bubble-question');
    const answer = document.getElementById(question.getAttribute('aria-controls'));
    expect(answer.hidden).toBe(true);
    question.click();
    expect(question.getAttribute('aria-expanded')).toBe('true');
    expect(answer.hidden).toBe(false);
    const panel = document.querySelector('#faq-bubble-panel');
    const scan = () => axe.run(panel, { rules: { 'color-contrast': { enabled: false } } });
    expect((await scan()).violations).toEqual([]);
    document.querySelector('[data-tab="message"]').click();
    await vi.waitFor(() => expect(document.querySelector('#help-email')).not.toBeNull());
    for (const field of panel.querySelectorAll('input, select, textarea')) {
      expect(field.getAttribute('aria-label') || field.labels?.length).toBeTruthy();
    }
    expect((await scan()).violations).toEqual([]);
  });

  it('keeps a failed message editable and explains how to retry', async () => {
    vi.mocked(submitMessage).mockRejectedValueOnce(new Error('Offline'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    openHelp();
    document.querySelector('[data-tab="message"]').click();
    await vi.waitFor(() => expect(document.querySelector('#help-message')).not.toBeNull());
    const form = document.querySelector('.faq-bubble-message-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(form.querySelector('[role="alert"]').textContent).toContain('try again'));
    expect(form.hidden).toBe(false);
    expect(form.querySelector('button').disabled).toBe(false);
    expect(document.querySelector('.faq-bubble-message-sent').hidden).toBe(true);
  });
});

describe('product preview', () => {
  let intersection;
  let reduced;
  let play;
  let pause;
  beforeEach(() => {
    document.body.innerHTML = new DOMParser().parseFromString(home, 'text/html').body.innerHTML;
    reduced = { matches: false, addEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', vi.fn((query) => query.includes('reduced') ? reduced : { matches: false, addEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback) { intersection = callback; }
      observe() {}
    });
    vi.stubGlobal('scrollY', 0);
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  it('does not fetch video while hidden; exposes the visible preview and persists dismissal', () => {
    initProductPreview();
    intersection([{ isIntersecting: true }]);
    const floating = document.querySelector('[data-floating-preview]');
    const video = floating.querySelector('video');
    expect(video.hasAttribute('src')).toBe(false);
    expect(floating.hasAttribute('inert')).toBe(true);
    vi.stubGlobal('scrollY', 1000);
    window.dispatchEvent(new Event('scroll'));
    expect(video.getAttribute('src')).toContain('host-preview.mp4');
    expect(floating.getAttribute('aria-hidden')).toBe('false');
    expect(floating.hasAttribute('inert')).toBe(false);
    floating.querySelector('[data-floating-dismiss]').click();
    expect(floating.hasAttribute('inert')).toBe(true);
    expect(sessionStorage.getItem('collabnb_preview_dismissed')).toBe('1');
    window.dispatchEvent(new Event('scroll'));
    expect(floating.classList.contains('visible')).toBe(false);
    expect(pause).toHaveBeenCalled();
  });

  it('never autoplays ambient video with reduced motion enabled', () => {
    reduced.matches = true;
    vi.stubGlobal('scrollY', 1000);
    initProductPreview();
    intersection([{ isIntersecting: true }]);
    expect(play).not.toHaveBeenCalled();
    expect(document.querySelector('.mac-screen-video').hasAttribute('src')).toBe(false);
  });

  it('keeps walkthrough controls focused and couples music to pause and mute', () => {
    vi.stubGlobal('scrollY', 1000);
    initProductPreview();
    const trigger = document.querySelector('[data-preview-open]');
    trigger.focus();
    trigger.click();
    const panel = document.querySelector('#preview-modal-overlay');
    expect(panel.contains(document.activeElement)).toBe(true);
    panel.querySelector('[data-preview-select="host"]').click();
    expect(document.activeElement).toBe(panel.querySelector('.preview-tab[data-preview-select="host"]'));
    const video = panel.querySelector('video');
    const audio = panel.querySelector('audio');
    video.dispatchEvent(new Event('pause'));
    expect(pause.mock.contexts).toContain(audio);
    video.muted = true;
    video.dispatchEvent(new Event('volumechange'));
    expect(audio.muted).toBe(true);
    panel.querySelector('#preview-modal-close').click();
    expect(document.activeElement).toBe(trigger);
    expect(panel.hasAttribute('inert')).toBe(true);
  });
});

it('restores existing scroll locks and preserves already inert background content', () => {
  document.body.innerHTML = '<main inert></main><button id="opener">Open</button><div id="dialog"><button>Close</button></div>';
  document.body.style.overflow = 'clip';
  document.querySelector('#opener').focus();
  const dialog = createDialog(document.querySelector('#dialog'));
  dialog.open();
  dialog.close();
  expect(document.body.style.overflow).toBe('clip');
  expect(document.querySelector('main').hasAttribute('inert')).toBe(true);
});
