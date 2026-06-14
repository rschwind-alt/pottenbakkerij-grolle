import { createContext, useContext, useMemo, useState } from "react";

import { localeMap, translations } from "./translations";

const STORAGE_KEY = "grolle_language";
const FALLBACK_LANGUAGE = "nl";

const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored]) {
      return stored;
    }
  } catch {
    // ignore storage access issues
  }

  if (typeof navigator !== "undefined") {
    const browserLanguage = navigator.language?.toLowerCase().startsWith("de") ? "de" : "nl";
    if (translations[browserLanguage]) {
      return browserLanguage;
    }
  }

  return FALLBACK_LANGUAGE;
}

function resolveTranslation(language, key) {
  return key.split(".").reduce((value, part) => (value ? value[part] : undefined), translations[language]);
}

function interpolate(template, vars = {}) {
  if (typeof template !== "string") {
    return template;
  }
  return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey) => {
    const key = rawKey.trim();
    return vars[key] ?? "";
  });
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = (nextLanguage) => {
    if (!translations[nextLanguage]) {
      return;
    }
    setLanguageState(nextLanguage);
    try {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // ignore storage access issues
    }
  };

  const value = useMemo(() => {
    const t = (key, vars) => {
      const translation = resolveTranslation(language, key) ?? resolveTranslation(FALLBACK_LANGUAGE, key) ?? key;
      return interpolate(translation, vars);
    };

    return {
      language,
      locale: localeMap[language] || localeMap[FALLBACK_LANGUAGE],
      setLanguage,
      t,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }
  return context;
}
