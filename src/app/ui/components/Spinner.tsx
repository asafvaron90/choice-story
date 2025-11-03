import * as React from 'react';
import { cn } from '@/app/_lib/utils';
import { cva } from 'class-variance-authority';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  size: 'default' | 'sm' | 'lg' | 'xl';
}

const spinnerVariants = cva(
  [
    'animate-spin',
    'rounded-full',
    'border-t-2',
    'border-b-2',
    'border-blue-200',
    'dark:border-gray-700',
  ],
  {
    variants: {
      size: {
        default: 'w-8 h-8',
        sm: 'w-6 h-6',
        lg: 'w-10 h-10',
        xl: 'w-14 h-14',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export function Spinner({ className, size, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        spinnerVariants({ size }),
        className,
      )}
      {...props}
    />
  );
}

export default Spinner;