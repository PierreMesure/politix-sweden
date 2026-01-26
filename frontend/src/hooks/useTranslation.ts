"use client";

import en from '../locales/en.json';
import sv from '../locales/sv.json';

// Simple translation hook. 
// In a real app, you might use 'next-intl' or 'react-i18next' and handle locale switching context.
const translations = {
  en,
  sv,
};

type Locale = keyof typeof translations;
type TranslationKey = keyof typeof en;

export function useTranslation(locale: Locale = 'sv') {
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k as keyof typeof value];
      } else {
        return key; // Fallback to key if not found
      }
    }
    
    return value as string;
  };

  return { t };
}
