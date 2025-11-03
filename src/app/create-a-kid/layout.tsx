"use client";

import { ReactNode } from "react";
import AuthProviderWrapper from "@/app/ui/components/AuthProviderWrapper";

export default function CreateAKidLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProviderWrapper>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mt-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AuthProviderWrapper>
  );
} 