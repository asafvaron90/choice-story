"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Check, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepAccordionItemProps {
  title: string;
  isActive?: boolean;
  isCompleted?: boolean;
  isDisabled?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const StepAccordionItem: React.FC<StepAccordionItemProps> = ({
  title,
  isActive = false,
  isCompleted = false,
  isDisabled = false,
  isExpanded,
  onToggle,
  children,
  isLoading = false,
  icon,
}) => {
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
          isActive ? "bg-blue-50" : "bg-white"
        )}
      >
        <div className="flex items-center gap-2">
          {icon ? (
            icon
          ) : (
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300",
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
          )}
          <span className="font-medium">{title}</span>
        </div>
        {isDisabled ? null : (
          isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-300" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 transition-transform duration-300" />
          )
        )}
      </button>
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isDisabled ? "pointer-events-none" : "",
          isExpanded ? "animate-accordion-down" : "animate-accordion-up",
          !isExpanded && "h-0"
        )}
      >
        {isExpanded && (
          <div className="px-4 py-4 border-t border-gray-100">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

interface AccordionProps {
  children?: React.ReactNode;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  );
};

export default StepAccordionItem; 