import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt'];
const DEFAULT_LANGUAGE = 'en';

// Every namespace file lives at ./locales/<lang>/<namespace>.json — this glob
// picks up new namespaces automatically as they're added, no manual registry.
const modules = import.meta.glob('./locales/*/*.json', { eager: true });

const resources = {};
for (const path in modules) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lang, namespace] = match;
  resources[lang] ??= {};
  resources[lang][namespace] = modules[path].default ?? modules[path];
}

const namespaces = Array.from(
  new Set(Object.values(resources).flatMap((byNs) => Object.keys(byNs)))
);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: namespaces,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });

export default i18n;
