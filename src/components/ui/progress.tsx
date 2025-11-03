"use client"

import React from "react"

interface ProgressProps {
  value?: number
  className?: string
}

export function Progress({ value = 0, className = "" }: ProgressProps) {
  return (
    <div 
      className={`relative w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
    >
      <div
        className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
        style={{ width: `${value}%` }}
      />
    </div>
  )
} 