/**
 * Avatar Generator Component
 * 
 * This component provides avatar generation capabilities using the new AI bot system
 * while maintaining compatibility with the existing avatar workflow.
 */

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, User, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { KidDetails } from '@/models';
import { AIAvatarService } from '@/app/services/ai-avatar.service';
import { toast } from "@/components/ui/use-toast";
import ImageUrl from './ImageUrl';

export interface AvatarGeneratorProps {
  kidDetails: KidDetails;
  userId: string;
  sourceImageUrl?: string;
  onAvatarGenerated?: (avatarUrl: string, analysis?: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  autoGenerate?: boolean;
  showAnalysis?: boolean;
  className?: string;
  useAIBots?: boolean;
}

export const AvatarGenerator: React.FC<AvatarGeneratorProps> = ({
  kidDetails,
  userId,
  sourceImageUrl,
  onAvatarGenerated,
  onError,
  disabled = false,
  autoGenerate = false,
  showAnalysis = true,
  className = "",
  useAIBots = true
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = AIAvatarService.canGenerateAvatar(kidDetails);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await AIAvatarService.generateAndAnalyzeAvatar({
        kidDetails,
        userId,
        sourceImageUrl
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to generate avatar");
      }

      setGeneratedAvatarUrl(result.avatarUrl || null);
      setAnalysis(result.analysis || null);

      if (result.avatarUrl) {
        onAvatarGenerated?.(result.avatarUrl, result.analysis);
      }

      toast({
        title: "Avatar Generated",
        description: `Successfully created avatar for ${kidDetails.name}`,
        duration: 3000,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);

      toast({
        title: "Avatar Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });

    } finally {
      setIsGenerating(false);
    }
  }, [kidDetails, userId, sourceImageUrl, onAvatarGenerated, onError, canGenerate, isGenerating]);

  const handleRetry = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-generate on mount if enabled
  React.useEffect(() => {
    if (autoGenerate && canGenerate && !isGenerating && !generatedAvatarUrl && !error) {
      handleGenerate();
    }
  }, [autoGenerate, canGenerate, isGenerating, generatedAvatarUrl, error, handleGenerate]);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {useAIBots ? (
            <Sparkles className="h-5 w-5 text-purple-600" />
          ) : (
            <User className="h-5 w-5" />
          )}
          {useAIBots ? "AI Avatar Generator" : "Avatar Generator"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {canGenerate 
            ? `Generate a custom avatar for ${kidDetails.name}${useAIBots ? " using AI" : ""}`
            : "Complete kid details to enable avatar generation"
          }
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isGenerating}
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {generatedAvatarUrl && !error && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Avatar generated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Kid Details Summary */}
        <div className="p-3 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Kid Details:</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Name: {kidDetails.name || "Not set"}</div>
            <div>Age: {kidDetails.age || "Not set"}</div>
            <div>Gender: {kidDetails.gender || "Not set"}</div>
          </div>
        </div>

        {/* Generate Button */}
        {!autoGenerate && (
          <Button
            onClick={handleGenerate}
            disabled={disabled || isGenerating || !canGenerate}
            className="w-full"
            variant={useAIBots ? "default" : "outline"}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Avatar...
              </>
            ) : (
              <>
                {useAIBots ? (
                  <Sparkles className="mr-2 h-4 w-4" />
                ) : (
                  <User className="mr-2 h-4 w-4" />
                )}
                Generate {useAIBots ? "AI " : ""}Avatar
              </>
            )}
          </Button>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              <p className="text-sm text-muted-foreground">
                Creating your avatar{useAIBots ? " with AI" : ""}...
              </p>
              <p className="text-xs text-muted-foreground">This may take a few moments</p>
            </div>
          </div>
        )}

        {/* Generated Avatar Display */}
        {generatedAvatarUrl && !isGenerating && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Generated Avatar:</h4>
            <div className="relative aspect-square w-full max-w-sm mx-auto rounded-lg overflow-hidden border">
              <ImageUrl
                src={generatedAvatarUrl}
                alt={`Generated avatar for ${kidDetails.name}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            
            {/* Regenerate Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate New Avatar
            </Button>
          </div>
        )}

        {/* Analysis Display */}
        {showAnalysis && analysis && !isGenerating && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Character Analysis:</h4>
            <div className="p-3 bg-muted rounded-lg">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-48">
                {analysis}
              </pre>
            </div>
          </div>
        )}

        {/* No Avatar State */}
        {!isGenerating && !generatedAvatarUrl && !error && !autoGenerate && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No avatar generated yet</p>
            {canGenerate && (
              <p className="text-xs mt-1">Click the generate button to create an avatar</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvatarGenerator;
