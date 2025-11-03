import * as React from 'react';
import { cn } from '@/app/_lib/utils';
import { cva } from 'class-variance-authority';

interface OptionButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
  isSelected: boolean;
  handleSelect: (value: string) => void;
}

const optionButtonVariants = cva(
  [
    'flex',
    'items-center',
    'justify-center',
    'rounded-md',
    'border',
    'border-gray-200',
    'dark:border-gray-700',
    'p-3',
    'text-l',
  ],
  {
    variants: {
      isSelected: {
        true: ['bg-blue-500', 'text-white'],
        false: ['bg-white', 'text-gray-700', 'dark:text-gray-200'],
      },
    },
  }
);

function OptionButton({
  value,
  isSelected,
  handleSelect,
  className,
  ...props
}: OptionButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        optionButtonVariants({ isSelected }),
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        handleSelect(value);
      }}
      {...props}
    >
      {value}
    </button>
  );
}

interface OptionGroupProps {
  options: string[];
  selectedOption: string | null;
  onSelect: (option: string) => void;
}

export function OptionGroup({
  options,
  selectedOption,
  onSelect,
}: OptionGroupProps) {
  return (
    <div className="flow space-y-2">
      {options.map((option) => (
        <OptionButton
          key={option}
          value={option}
          isSelected={selectedOption === option}
          handleSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default OptionGroup;