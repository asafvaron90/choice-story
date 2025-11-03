"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations } from "../translations";
import { Translation } from "../translations/types";

export type Language = "en" | "he";
export type Direction = "ltr" | "rtl";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  direction: Direction;
  isRTL: boolean;
  t: Translation;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('he');
  const [direction, setDirection] = useState<Direction>('rtl');
  
  useEffect(() => {
    // Load language preference from localStorage on mount
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage) {
      setLanguageState(savedLanguage);
      const dir = savedLanguage === 'he' ? 'rtl' : 'ltr';
      setDirection(dir);
      document.documentElement.dir = dir;
      document.documentElement.lang = savedLanguage;
      
      // Update body styles immediately
      const body = document.body;
      body.style.direction = dir;
      if (dir === 'rtl') {
        body.classList.add('rtl');
        body.classList.remove('ltr');
      } else {
        body.classList.add('ltr');
        body.classList.remove('rtl');
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    const dir = lang === 'he' ? 'rtl' : 'ltr';
    setDirection(dir);
    localStorage.setItem('language', lang);
    localStorage.setItem('direction', dir); // Store direction in localStorage
    
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;

    // Update body styles
    const body = document.body;
    body.style.direction = dir;
    if (dir === 'rtl') {
      body.classList.add('rtl');
      body.classList.remove('ltr');
    } else {
      body.classList.add('ltr');
      body.classList.remove('rtl');
    }
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    direction,
    isRTL: direction === 'rtl',
    t: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      <div
        dir={direction}
        className={`transition-all duration-200 ${direction === 'rtl' ? 'rtl' : 'ltr'}`}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 
