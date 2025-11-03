"use client";

type SaveButtonsProps = {
  onSave?: () => void;
  onReturn?: () => void;
  saving?: boolean;
  hasGeneratedPages: boolean;
  hasExistingPages: boolean;
};

export const SaveButtons = ({ 
  onSave, 
  onReturn, 
  saving = false, 
  hasGeneratedPages,
  hasExistingPages 
}: SaveButtonsProps) => {
  if (hasGeneratedPages && onSave) {
    return (
      <div className="flex justify-center mt-8">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {saving && (
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
                fill="none"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <span>{saving ? 'Saving...' : hasExistingPages ? 'Save New Pages' : 'Save Generated Pages'}</span>
        </button>
      </div>
    );
  }
  
  if (onReturn) {
    return (
      <div className="flex justify-center mt-8">
        <button
          onClick={onReturn}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }
  
  return null;
};

export default SaveButtons; 