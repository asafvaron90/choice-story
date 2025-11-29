'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from './hooks/useTranslation';

export default function NotFound() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">{t.notFound.pageNotFound}</h2>
          <p className="text-gray-500 mb-8">
            {t.notFound.pageNotFoundMessage}
          </p>
        </div>
        
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">
              {t.notFound.goBackHome}
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard">
              {t.notFound.goToDashboard}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
