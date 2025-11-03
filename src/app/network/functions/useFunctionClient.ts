import { useState, useCallback } from 'react';
import { getFunctionClientAPI, FunctionClientAPI } from './FunctionClientAPI';

/**
 * React Hook for using Function Client API
 * Provides loading and error states
 */

interface UseFunctionClientReturn {
  client: FunctionClientAPI;
  isLoading: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useFunctionClient(): UseFunctionClientReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = getFunctionClientAPI();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    client,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Hook for async function calls with loading and error states
 */
export function useAsyncFunction<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<T>> | null>(null);

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFunction(...args);
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    data,
    reset,
  };
}

