"use client";

type ErrorNotificationProps = { 
  message: string; 
  onDismiss: () => void;
};

export const ErrorNotification = ({ message, onDismiss }: ErrorNotificationProps) => (
  <div className="fixed top-4 right-4 z-50 max-w-md bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 shadow-lg">
    <div className="flex justify-between items-start">
      <div className="flex">
        <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="font-semibold">Error</h3>
          <p className="text-sm">{message}</p>
        </div>
      </div>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
);

export default ErrorNotification; 