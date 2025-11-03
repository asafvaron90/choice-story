"use client";

import { useTranslation } from "@/app/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

export const LanguageSelector = () => {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="language-selector relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="min-w-[80px] flex items-center justify-between gap-2"
      >
        {language === 'he' ? 'עברית' : 'English'}
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </Button>
      
      {isOpen && (
        <div className="absolute mt-1 w-full bg-white shadow-md rounded-md overflow-hidden z-10">
          <button
            className={`w-full py-2 px-3 text-left hover:bg-gray-100 ${language === 'he' ? 'bg-gray-50' : ''}`}
            onClick={() => {
              setLanguage('he');
              setIsOpen(false);
            }}
          >
            עברית
          </button>
          <button
            className={`w-full py-2 px-3 text-left hover:bg-gray-100 ${language === 'en' ? 'bg-gray-50' : ''}`}
            onClick={() => {
              setLanguage('en');
              setIsOpen(false);
            }}
          >
            English
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector; 