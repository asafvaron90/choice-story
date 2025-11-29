'use client';

import React from 'react';
import { Check, Loader2, ChevronDown, ChevronRight, ChevronLeft, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/app/hooks/useTranslation";

interface StepProps {
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  isDisabled: boolean;
  isExpanded: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  isLoading?: boolean;
}

export const StoryStep: React.FC<StepProps> = ({
  title,
  isActive,
  isCompleted,
  isDisabled,
  isExpanded,
  onToggle,
  children,
  isLoading,
}) => {
  const { isRTL } = useTranslation();
  
  return (
    <div className={cn(
      "border rounded-lg mb-2 overflow-hidden transition-all duration-200",
      isActive ? "border-blue-500" : "border-gray-200",
      isDisabled ? "opacity-50" : "hover:border-blue-200"
    )}>
      <button
        onClick={onToggle}
        disabled={isDisabled}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between",
          isDisabled ? "cursor-not-allowed" : "cursor-pointer",
          isActive ? "bg-blue-50" : "bg-white",
          isRTL && "flex-row-reverse"
        )}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          {!isDisabled && (
            isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              isRTL ? (
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )
            )
          )}
        </div>
        <div className={cn(
          "flex items-center gap-2",
          isRTL && "flex-row-reverse"
        )}>
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            isCompleted ? "bg-green-500 text-white" : 
            isActive ? "bg-blue-500 text-white" : 
            "bg-gray-200"
          )}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isCompleted ? (
              <Check className="w-4 h-4" />
            ) : isDisabled ? (
              <Lock className="w-4 h-4" />
            ) : null}
          </div>
          <span className="font-medium">{title}</span>
        </div>
      </button>
      {isExpanded && (
        <div className={cn(
          "border-t border-gray-100",
          isDisabled && "pointer-events-none"
        )}>
          <div className="px-4 py-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}; 