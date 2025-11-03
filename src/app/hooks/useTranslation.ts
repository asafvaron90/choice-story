import { useLanguage } from "../context/LanguageContext";
import type { Translation } from "../translations/types";

// Re-export the useLanguage hook as useTranslation for backward compatibility
export const useTranslation = useLanguage;

// Type-safe translation key helper
export type TranslationKey = keyof Translation;
export type NestedTranslationKey<T extends TranslationKey> = keyof Translation[T]; 