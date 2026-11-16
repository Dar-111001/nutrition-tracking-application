import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import he from './he.json';
import en from './en.json';
import es from './es.json';

const STORAGE_KEY = 'lang';
const DEFAULT_LANG = 'he';

// localStorage can throw (private mode, blocked site data). The language is
// only a convenience, so fall back to the default instead of crashing the app.
function savedLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

// <html lang> tells screen readers and translation tools which language the
// page is in; dir flips the layout for Hebrew.
function setDocumentLanguage(code) {
  document.documentElement.lang = code;
  document.documentElement.dir = code === 'he' ? 'rtl' : 'ltr';
}

/** Switch the app's language, update <html lang/dir>, and remember the choice. */
export function applyLanguage(code) {
  i18n.changeLanguage(code);
  setDocumentLanguage(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Not saved: the choice still applies until the page is reloaded
  }
}

const initialLang = savedLanguage();

i18n.use(initReactI18next).init({
  resources: {
    he: { translation: he },
    en: { translation: en },
    es: { translation: es },
  },
  lng: initialLang,
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false },
});

setDocumentLanguage(initialLang);

export default i18n;
