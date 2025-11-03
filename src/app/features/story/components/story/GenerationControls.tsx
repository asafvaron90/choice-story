"use client";

type GenerationControlsProps = {
  onGeneratePages: () => void;
  generating: boolean;
  generationError: string | null;
  hasExistingPages: boolean;
};

export const GenerationControls = ({
  onGeneratePages,
  generating,
  generationError,
  hasExistingPages
}: GenerationControlsProps) => (
  <div className="flex justify-center mb-8">
    <button
      onClick={onGeneratePages}
      disabled={generating}
      className={`px-6 py-3 rounded-lg shadow-md transition duration-200 ${
        generating 
          ? 'bg-blue-400 text-white cursor-not-allowed' 
          : generationError 
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {generating 
        ? 'Generating Pages...' 
        : generationError 
          ? 'Retry Generation' 
          : hasExistingPages ? 'Regenerate Story Pages' : 'Generate Story Pages'}
    </button>
  </div>
);

export default GenerationControls; 