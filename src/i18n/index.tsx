import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

// Языки приложения. Тексты лежат рядом с экраном, который их показывает:
// const STRINGS = { ru: {...}, kk: {...}, en: {...} } и useStrings(STRINGS).
// Русский — основной: если перевода нет, показывается он.
export type Lang = 'ru' | 'kk' | 'en';

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: 'ru', label: 'Русский', short: 'РУС' },
  { code: 'kk', label: 'Қазақша', short: 'ҚАЗ' },
  { code: 'en', label: 'English', short: 'ENG' },
];

export type Translations<T> = { ru: T } & Partial<Record<Exclude<Lang, 'ru'>, T>>;

const STORAGE_KEY = 'app_language';

// Текущий язык для кода вне компонентов (подписи в lib/*, Alert в утилитах).
let currentLang: Lang = 'ru';

export function getLang(): Lang {
  return currentLang;
}

export function pick<T>(dict: Translations<T>, lang: Lang = currentLang): T {
  return dict[lang] ?? dict.ru;
}

function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode;
  return code === 'kk' || code === 'en' || code === 'ru' ? code : 'ru';
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: 'ru', setLang: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    currentLang = deviceLang();
    return currentLang;
  });

  // Выбор пользователя запоминается на устройстве и важнее языка телефона.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'ru' || saved === 'kk' || saved === 'en') {
          currentLang = saved;
          setLangState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang: (next) => {
        currentLang = next;
        setLangState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      },
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// Тексты экрана на текущем языке; экран перерисуется при смене языка.
export function useStrings<T>(dict: Translations<T>): T {
  const { lang } = useLanguage();
  return pick(dict, lang);
}
