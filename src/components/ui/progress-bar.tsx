import React from 'react';
import { cn } from "@submodule/lib/utils";

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressBar({ current, total, className }: ProgressBarProps) {
  // Calculate the percentage with a cap at 100%
  const percentage = Math.min(Math.round((current / total) * 100), 100);
  
  return (
    <div className={cn("w-full", className)}>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
    </div>
  );
} 