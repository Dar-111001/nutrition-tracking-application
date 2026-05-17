import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import he from './he.json';
import en from './en.json';
import es from './es.json';

const savedLang = localStorage.getItem('lang') || 'he';

i18n.use(initReactI18next).init({
  resources: {
    he: { translation: he },
    en: { translation: en },
    es: { translation: es },
  },
  lng: savedLang,
  fallbackLng: 'he',
  interpolation: { escapeValue: false },
});

document.documentElement.dir  = savedLang === 'he' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;

export default i18n;
