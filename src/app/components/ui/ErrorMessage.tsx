"use client";

type ErrorMessageProps = {
  message: string;
};

export const ErrorMessage = ({ message }: ErrorMessageProps) => (
  <div className="container mx-auto px-4 py-8">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      {message}
    </div>
  </div>
);

export default ErrorMessage; 