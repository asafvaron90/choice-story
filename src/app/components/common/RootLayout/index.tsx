"use client";

import { ReactNode } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';

interface RootLayoutProps {
  children: ReactNode;
}

export const RootLayout = ({ children }: RootLayoutProps) => {
  const { direction } = useLanguage();
  
  return (
    <div className={direction}>
      <main className="min-h-screen">{children}</main>
    </div>
  );
};

export default RootLayout; 