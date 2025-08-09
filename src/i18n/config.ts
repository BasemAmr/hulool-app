import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';

const resources = {
  ar: {
    translation: ar,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', // Set Arabic as the default language
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

export default i18n;