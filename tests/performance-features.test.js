import { beforeEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PricingTranslationProvider from '../app/src/i18n/PricingTranslationProvider.js';
import PricingTool, { PointsHelpTable } from '../app/src/components/PricingTool.jsx';

const mapMocks = vi.hoisted(() => ({ fail: false, remove: vi.fn() }));
vi.mock('mapbox-gl', () => ({
  default: {
    Map: class {
      constructor() { if (mapMocks.fail) throw new Error('WebGL unavailable'); }
      addControl() {}
      on() {}
      remove() { mapMocks.remove(); }
    },
    NavigationControl: class {},
  },
}));
import { openFullScreenMap } from '../scripts/globe-map.js';

beforeEach(() => {
  mapMocks.fail = false;
  mapMocks.remove.mockClear();
  document.body.innerHTML = '<div class="cnb-mp-wrap" style="display:flex"></div>';
  document.body.style.overflow = 'clip';
});

it('renders calculator labels and help with only its isolated English namespace', () => {
  const html = renderToStaticMarkup(createElement(PricingTranslationProvider, null,
    createElement(PricingTool), createElement(PointsHelpTable, { open: true, onClose() {} })));
  expect(html).toContain('What does a collab cost?');
  expect(html).toContain('Points by deliverable');
  expect(html).toContain('Who can produce');
  expect(html).not.toContain('zoneCopy.');
  expect(html).not.toContain('helpTable.');
});

it('restores the page when Mapbox cannot initialize', () => {
  mapMocks.fail = true;
  const onClose = vi.fn();
  expect(() => openFullScreenMap([], onClose)).toThrow('WebGL unavailable');
  expect(document.querySelector('.globe-map-overlay')).toBeNull();
  expect(document.body.style.overflow).toBe('clip');
  expect(document.querySelector('.cnb-mp-wrap').style.display).toBe('flex');
  expect(onClose).toHaveBeenCalledOnce();
});

it('closes a loaded map once and restores previous page state', () => {
  const onClose = vi.fn();
  const map = openFullScreenMap([], onClose);
  expect(document.body.style.overflow).toBe('hidden');
  map.close();
  map.close();
  expect(mapMocks.remove).toHaveBeenCalledOnce();
  expect(onClose).toHaveBeenCalledOnce();
  expect(document.body.style.overflow).toBe('clip');
  expect(document.querySelector('.cnb-mp-wrap').style.display).toBe('flex');
});
