/**
 * @kitz/i18n — locale dictionaries. Spanish is the source of truth.
 */
export const LOCALES = ['es', 'en', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export const strings = {
  es: {
    greeting: 'Kitz, tu asistente personal',
    tagline: 'KitZ es el sistema operativo que pone la IA a trabajar en tu negocio',
  },
  en: {
    greeting: 'Kitz, your personal assistant',
    tagline: 'KitZ is the operating system that puts AI to work for your business',
  },
  pt: {
    greeting: 'Kitz, seu assistente pessoal',
    tagline: 'KitZ é o sistema operacional que coloca a IA a trabalhar no seu negócio',
  },
} as const;
