import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';

/**
 * ENF-03 : interface en français, extensible à l'arabe et à l'anglais.
 * Aucune chaîne visible en dur dans un composant : tout passe par une clé de ce fichier.
 * Ajouter une langue = ajouter locales/<code>.json et une entrée dans `resources`.
 * L'arabe imposera `dir="rtl"` sur <html> : la bascule est déjà branchée sur `languageChanged`.
 */
export const SUPPORTED_LANGUAGES = ['fr'] as const;
export const RTL_LANGUAGES: readonly string[] = ['ar'];

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }, // React échappe déjà (protection XSS).
  returnNull: false,
});

i18n.on('languageChanged', (lng) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng;
  document.documentElement.dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
});

export default i18n;
