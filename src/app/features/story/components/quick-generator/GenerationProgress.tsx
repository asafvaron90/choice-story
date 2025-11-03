import { StoryStatus } from '@/models';
import { FC } from 'react';

interface GenerationProgressProps {
  progress: StoryStatus;
}

export const GenerationProgress: FC<GenerationProgressProps> = ({ progress }) => {
  return (
    <div className="w-full p-4 mt-4 rounded-lg bg-slate-50">
      <div className="mb-2 flex justify-between">
        <span className="text-sm font-medium">Generating Story</span>
        <span className="text-sm">{progress}</span>
      </div>
      
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}` }}
        ></div>
      </div>
      
      <p className="mt-2 text-sm text-gray-600">{progress}</p>
    </div>
  );
};

export default GenerationProgress;
