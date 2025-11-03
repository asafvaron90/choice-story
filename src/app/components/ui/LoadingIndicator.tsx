"use client";

type LoadingIndicatorProps = {
  message?: string;
};

export const LoadingIndicator = ({ message = "Loading..." }: LoadingIndicatorProps) => (
  <div className="container mx-auto px-4 py-8 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    <p className="ml-2">{message}</p>
  </div>
);

export default LoadingIndicator; 