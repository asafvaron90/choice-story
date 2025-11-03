import { useState, useEffect } from "react";

interface GenderSelectorProps {
  values: string[];
  onChange: (value: string) => void;
  initialValue?: string;
}

// Map to convert display values to API values
const _genderValueMap: Record<string, string> = {
  "Boy": "male",
  "Girl": "female",
  "זכר": "male",
  "נקבה": "female"
};

// Map to convert API values to display values
const _apiToDisplayMap: Record<string, string> = {
  "male": "Boy", // Default English
  "female": "Girl", // Default English
};

export default function GenderSelector({ values, onChange, initialValue }: GenderSelectorProps) {
  const [selectedValue, setSelectedValue] = useState(initialValue || values[0]);

  useEffect(() => {
    if (initialValue) {
      setSelectedValue(initialValue);
    }
  }, [initialValue]);

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    onChange(value === values[0] ? 'male' : 'female');
  };

  return (
    <div className="flex space-x-4">
      {values.map((gender, index) => (
        <button
          key={index}
          className={`
            px-4 py-2 
            border 
            transition-colors 
            rounded-md 
            ${
              selectedValue === gender
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }
          `}
          onClick={() => handleSelect(gender)}
          type="button"
        >
          {gender}
        </button>
      ))}
    </div>
  );
} 