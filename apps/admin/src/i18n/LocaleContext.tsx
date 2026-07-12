import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyDocumentLocale,
  formatDateTime,
  formatNumber,
  getInitialLocale,
  persistLocale,
  roleLabel,
  sourceLabel,
  statusLabel,
  translate,
  type DocumentLike,
  type StorageLike
} from "./locale";
import type { Locale, TranslationKey } from "./translations";

type LocaleContextValue = {
  locale: Locale;
  direction: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  status: (value: string) => string;
  role: (value: string) => string;
  source: (value: string) => string;
  number: (value: number | string) => string;
  dateTime: (value: string | Date | undefined) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children, storage = window.localStorage, documentRef = document }: { children: ReactNode; storage?: StorageLike; documentRef?: DocumentLike }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale(storage));

  useEffect(() => {
    persistLocale(storage, locale);
    applyDocumentLocale(documentRef, locale);
  }, [documentRef, locale, storage]);

  const value = useMemo<LocaleContextValue>(() => {
    const setLocale = (next: Locale) => setLocaleState(next);
    return {
      locale,
      direction: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      toggleLocale: () => setLocale(locale === "ar" ? "en" : "ar"),
      t: (key, values) => translate(locale, key, values),
      status: (status) => statusLabel(locale, status),
      role: (role) => roleLabel(locale, role),
      source: (source) => sourceLabel(locale, source),
      number: (value) => formatNumber(locale, value),
      dateTime: (value) => formatDateTime(locale, value)
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider is missing");
  return value;
}
