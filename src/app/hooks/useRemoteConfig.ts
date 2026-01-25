'use client';

import { useState, useEffect, useCallback } from 'react';
import { RemoteConfigService, RemoteConfigEnv, RemoteConfigKey } from '@/app/services/remote-config.service';

/**
 * Hook to get a string value from Remote Config
 */
export function useRemoteConfigString<K extends RemoteConfigKey>(key: K, defaultValue: string = ''): {
  value: string;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [value, setValue] = useState<string>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchValue = useCallback(async () => {
    try {
      setLoading(true);
      const result = await RemoteConfigService.getString(key);
      setValue(result || defaultValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch config'));
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  useEffect(() => {
    fetchValue();
  }, [fetchValue]);

  const refresh = useCallback(async () => {
    await RemoteConfigService.refresh();
    await fetchValue();
  }, [fetchValue]);

  return { value, loading, error, refresh };
}

/**
 * Hook to get a number value from Remote Config
 */
export function useRemoteConfigNumber<K extends RemoteConfigKey>(key: K, defaultValue: number = 0): {
  value: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [value, setValue] = useState<number>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchValue = useCallback(async () => {
    try {
      setLoading(true);
      const result = await RemoteConfigService.getNumber(key);
      setValue(result || defaultValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch config'));
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  useEffect(() => {
    fetchValue();
  }, [fetchValue]);

  const refresh = useCallback(async () => {
    await RemoteConfigService.refresh();
    await fetchValue();
  }, [fetchValue]);

  return { value, loading, error, refresh };
}

/**
 * Hook to get a boolean value from Remote Config
 */
export function useRemoteConfigBoolean<K extends RemoteConfigKey>(key: K, defaultValue: boolean = false): {
  value: boolean;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [value, setValue] = useState<boolean>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchValue = useCallback(async () => {
    try {
      setLoading(true);
      const result = await RemoteConfigService.getBoolean(key);
      setValue(result ?? defaultValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch config'));
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  useEffect(() => {
    fetchValue();
  }, [fetchValue]);

  const refresh = useCallback(async () => {
    await RemoteConfigService.refresh();
    await fetchValue();
  }, [fetchValue]);

  return { value, loading, error, refresh };
}

/**
 * Hook to get a JSON value from Remote Config
 */
export function useRemoteConfigJSON<T, K extends RemoteConfigKey = RemoteConfigKey>(key: K, defaultValue: T | null = null): {
  value: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [value, setValue] = useState<T | null>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchValue = useCallback(async () => {
    try {
      setLoading(true);
      const result = await RemoteConfigService.getJSON<T, K>(key);
      setValue(result ?? defaultValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch config'));
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  useEffect(() => {
    fetchValue();
  }, [fetchValue]);

  const refresh = useCallback(async () => {
    await RemoteConfigService.refresh();
    await fetchValue();
  }, [fetchValue]);

  return { value, loading, error, refresh };
}

/**
 * Hook to get the current Remote Config environment
 */
export function useRemoteConfigEnv(): RemoteConfigEnv {
  const [env, setEnv] = useState<RemoteConfigEnv>('staging');

  useEffect(() => {
    setEnv(RemoteConfigService.getEnvironment());
  }, []);

  return env;
}

/**
 * Hook to get all Remote Config values
 */
export function useRemoteConfigAll(): {
  values: Record<string, string>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchValues = useCallback(async () => {
    try {
      setLoading(true);
      const result = await RemoteConfigService.getAll();
      setValues(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch config'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const refresh = useCallback(async () => {
    await RemoteConfigService.refresh();
    await fetchValues();
  }, [fetchValues]);

  return { values, loading, error, refresh };
}
