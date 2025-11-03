/**
 * AI Operation Status Component
 * 
 * Displays the status of AI operations with progress indicators,
 * loading states, and error handling.
 */

import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Clock,
  Sparkles,
  Image as ImageIcon,
  User,
  BookOpen
} from "lucide-react";
import { useAILoadingState, AIOperation, AILoadingStateService } from '@/app/services/ai-loading-state.service';
import { cn } from "@/lib/utils";

export interface AIOperationStatusProps {
  operationId?: string;
  operationType?: AIOperation['type'];
  showAll?: boolean;
  onRetry?: (operationId: string) => void;
  className?: string;
  compact?: boolean;
}

export const AIOperationStatus: React.FC<AIOperationStatusProps> = ({
  operationId,
  operationType,
  showAll = false,
  onRetry,
  className = "",
  compact = false
}) => {
  const { operations } = useAILoadingState();
  
  // Get operations to display
  const operationsToShow = React.useMemo(() => {
    if (operationId) {
      const operation = operations[operationId];
      return operation ? [operation] : [];
    }
    
    if (operationType) {
      return Object.values(operations).filter(op => op.type === operationType);
    }
    
    if (showAll) {
      return Object.values(operations);
    }
    
    return [];
  }, [operations, operationId, operationType, showAll]);

  if (operationsToShow.length === 0) {
    return null;
  }

  const getOperationIcon = (type: AIOperation['type'], status: AIOperation['status']) => {
    const iconClass = "h-4 w-4";
    
    if (status === 'loading') {
      return <Loader2 className={cn(iconClass, "animate-spin")} />;
    }
    
    if (status === 'success') {
      return <CheckCircle className={cn(iconClass, "text-green-600")} />;
    }
    
    if (status === 'error') {
      return <AlertCircle className={cn(iconClass, "text-red-600")} />;
    }
    
    switch (type) {
      case 'story_generation':
        return <BookOpen className={iconClass} />;
      case 'avatar_generation':
        return <User className={iconClass} />;
      case 'image_generation':
        return <ImageIcon className={iconClass} />;
      case 'image_analysis':
        return <Sparkles className={iconClass} />;
      default:
        return <Loader2 className={iconClass} />;
    }
  };

  const getOperationColor = (status: AIOperation['status']) => {
    switch (status) {
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = end.getTime() - startTime.getTime();
    const seconds = Math.floor(duration / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  };

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {operationsToShow.map((operation) => (
          <div
            key={operation.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              getOperationColor(operation.status)
            )}
          >
            {getOperationIcon(operation.type, operation.status)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {operation.message || AILoadingStateService.getLoadingMessage(operation.type)}
              </p>
              {operation.status === 'loading' && operation.progress !== undefined && (
                <Progress value={operation.progress} className="h-1 mt-1" />
              )}
            </div>
            {operation.status === 'error' && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(operation.id)}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {operationsToShow.map((operation) => (
        <Card key={operation.id} className={cn("overflow-hidden", getOperationColor(operation.status))}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                {getOperationIcon(operation.type, operation.status)}
                <span>
                  {operation.message || AILoadingStateService.getLoadingMessage(operation.type)}
                </span>
              </div>
              {operation.startTime && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(operation.startTime, operation.endTime)}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Progress Bar */}
            {operation.status === 'loading' && operation.progress !== undefined && (
              <div className="space-y-2">
                <Progress value={operation.progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(operation.progress)}% complete</span>
                  {(() => {
                    const timeRemaining = AILoadingStateService.getEstimatedTimeRemaining(operation.id);
                    return timeRemaining ? (
                      <span>{AILoadingStateService.formatTimeRemaining(timeRemaining)}</span>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {/* Error Display */}
            {operation.status === 'error' && operation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{operation.error}</span>
                  {onRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRetry(operation.id)}
                      className="ml-2 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {operation.status === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Operation completed successfully!
                </AlertDescription>
              </Alert>
            )}

            {/* Metadata Display */}
            {operation.metadata && Object.keys(operation.metadata).length > 0 && (
              <div className="text-xs text-muted-foreground">
                <details>
                  <summary className="cursor-pointer hover:text-foreground">
                    Operation Details
                  </summary>
                  <div className="mt-2 pl-4 border-l-2 border-muted">
                    {Object.entries(operation.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AIOperationStatus;
