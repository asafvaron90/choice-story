import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GenerationControlsProps {
  onGenerate: (problem: string) => Promise<void>;
  isGenerating: boolean;
}

export const GenerationControls: FC<GenerationControlsProps> = ({
  onGenerate,
  isGenerating
}) => {
  const [problem, setProblem] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGenerating || !problem) return;
    
    await onGenerate(problem);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="problem" className="block text-sm font-medium">
          Story Problem
        </label>
        <Input
          id="problem"
          placeholder="Describe a problem for the story"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          disabled={isGenerating}
        />
      </div>
      
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isGenerating || !problem}
        >
          {isGenerating ? 'Generating...' : 'Generate Story'}
        </Button>
      </div>
    </form>
  );
};

export default GenerationControls;
