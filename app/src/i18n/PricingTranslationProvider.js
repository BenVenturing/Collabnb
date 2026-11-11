import { createElement } from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import pricingTool from './locales/en/pricingTool.json';

// The public calculator is English-only. Keep its single namespace separate
// from the multilingual app's full resource registry and global instance.
const pricingI18n = createInstance();
pricingI18n.init({
  resources: { en: { pricingTool } },
  lng: 'en',
  fallbackLng: 'en',
  ns: ['pricingTool'],
  defaultNS: 'pricingTool',
  initImmediate: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default function PricingTranslationProvider({ children }) {
  return createElement(I18nextProvider, { i18n: pricingI18n }, children);
}
