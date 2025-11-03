import React from "react";

interface EnumRadioButtonsProps<T> {
    values: T[]; // Array of enum values
    onChange: (selectedValue: T) => void; // Callback function for selection change
}

const RadioButtons = <T extends string>({
    values,
    onChange,
}: EnumRadioButtonsProps<T>) => {
    const [selectedValue, setSelectedValue] = React.useState<T | null>(null);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value as T;
        setSelectedValue(value);
        onChange(value); // Call the callback function
    };

    return (
        <div className="radio-buttons">
            {values.filter((v)=> typeof v === 'string').map((value) => (
                <label key={value}>
                    <input
                        type="radio"
                        value={value.toString()}
                        checked={selectedValue === value}
                        onChange={handleChange}
                    />
                    {value}
                </label>
            ))}
        </div>
    );
};

export default RadioButtons;
