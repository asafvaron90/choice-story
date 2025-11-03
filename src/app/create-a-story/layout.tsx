"use client";

import React from "react";

export default function CreateAStoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-grow flex flex-col">
        {/* Main content area */}
        <main className="flex-grow flex flex-col p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
