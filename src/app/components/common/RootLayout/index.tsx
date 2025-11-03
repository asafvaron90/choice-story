"use client";

import { ReactNode } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { Header } from '../Header';

interface RootLayoutProps {
  children: ReactNode;
}

export const RootLayout = ({ children }: RootLayoutProps) => {
  const { direction } = useLanguage();
  
  return (
    <div className={direction}>
      <Header />
      <main className="min-h-screen">{children}</main>
      <footer className="bg-white border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Choice Story. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default RootLayout; 