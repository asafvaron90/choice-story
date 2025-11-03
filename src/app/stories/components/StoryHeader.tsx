"use client";

type StoryHeaderProps = {
  title: string;
  problemDescription: string;
};

export const StoryHeader = ({ title, problemDescription }: StoryHeaderProps) => (
  <div className="mb-8">
    <h1 className="text-3xl font-bold mb-4">{title}</h1>
    <p className="text-gray-600">{problemDescription}</p>
  </div>
);

export default StoryHeader; 