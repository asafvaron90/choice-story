'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ApiDocsLinkProps {
  className?: string;
}

/**
 * ApiDocsLink component
 * Provides a link to the API documentation page
 */
export default function ApiDocsLink({ className = '' }: ApiDocsLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === '/api-docs';
  
  return (
    <Link 
      href="/api-docs" 
      className={`api-docs-link ${isActive ? 'active' : ''} ${className}`}
    >
      API Documentation
      <style jsx>{`
        .api-docs-link {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          text-decoration: none;
          color: #4f46e5;
          font-weight: 500;
          transition: color 0.2s, background-color 0.2s;
          border-radius: 0.375rem;
        }
        
        .api-docs-link:hover {
          background-color: rgba(79, 70, 229, 0.1);
        }
        
        .api-docs-link.active {
          color: white;
          background-color: #4f46e5;
        }
        
        .api-docs-link.active:hover {
          background-color: #4338ca;
        }
      `}</style>
    </Link>
  );
} 