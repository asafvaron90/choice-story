import {
  fetchAndActivate,
  getValue,
  ensureInitialized,
} from 'firebase/remote-config';
import * as Sentry from '@sentry/nextjs';

/**
 * Remote Config schema definition
 * All config keys must be defined here with their types
 */
export interface RemoteConfigSchema {
  // Feature flags
  feature_new_story_flow: boolean;
  feature_premium_content: boolean;
  
  // App settings
  max_stories_per_day: number;
  story_generation_timeout_ms: number;
  
  // Maintenance
  maintenance_mode: boolean;
  maintenance_message: string;
  
  // Image generation
  image_generation_enabled: boolean;
  image_generation_provider: string;
  
  // App info
  welcome_message: string;
  app_version_minimum: string;
  
  // Bot versions
  bot_version_avatar_image_ai: string;
  bot_version_story_image_ai: string;
  bot_version_full_story_generation_ai: string;
}

// All valid config keys
export type RemoteConfigKey = keyof RemoteConfigSchema;

// Type for local config values
type ConfigValue = string | number | boolean;
type LocalConfig = Record<string, ConfigValue>;

// Remote config environment type
export type RemoteConfigEnv = 'staging' | 'production' | 'local';

// Custom error for Remote Config failures
export class RemoteConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemoteConfigError';
  }
}

/**
 * Firebase Remote Config Service
 * 
 * Supports three environments:
 * - staging: Uses Firebase Remote Config with staging template
 * - production: Uses Firebase Remote Config with production template
 * - local: Uses local JSON file for testing (remote-config.local.json)
 * 
 * Environment is determined by:
 * 1. NEXT_PUBLIC_REMOTE_CONFIG_ENV environment variable (for local development)
 * 2. APP_ENV/NEXT_PUBLIC_APP_ENV (fallback)
 * 3. Hostname detection (for deployed environments)
 */
export class RemoteConfigService {
  private static isInitialized = false;
  private static localConfig: LocalConfig | null = null;
  private static remoteConfigValues: LocalConfig | null = null; // Parsed config values from Firebase
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Get the current remote config environment
   */
  static getEnvironment(): RemoteConfigEnv {
    // Check explicit remote config environment variable first
    const remoteConfigEnv = process.env.NEXT_PUBLIC_REMOTE_CONFIG_ENV;
    if (remoteConfigEnv === 'local' || remoteConfigEnv === 'staging' || remoteConfigEnv === 'production') {
      return remoteConfigEnv;
    }

    // Fallback to APP_ENV
    const appEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV;
    if (appEnv === 'production') {
      return 'production';
    }
    if (appEnv === 'development') {
      return 'staging';
    }

    // For client-side, check hostname
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Use staging by default for local development, unless overridden
        return 'staging';
      }
      if (hostname.includes('staging') || hostname.includes('stage')) {
        return 'staging';
      }
      if (hostname === 'choice-story.com' || hostname === 'www.choice-story.com') {
        return 'production';
      }
    }

    // Default to staging
    return 'staging';
  }

  /**
   * Check if using local config
   */
  static isUsingLocalConfig(): boolean {
    return this.getEnvironment() === 'local';
  }

  /**
   * Load local config from JSON file
   */
  private static async loadLocalConfig(): Promise<LocalConfig> {
    if (this.localConfig) {
      return this.localConfig;
    }

    try {
      // Dynamic import of local config file
      const config = await import('@/config/remote-config.local.json');
      this.localConfig = config.default || config;
      const values = Object.values(this.localConfig!).filter((k, v) => !v);
      console.log('[RemoteConfig] 📁 Loaded local config:', values);
      return this.localConfig!;
    } catch (_error) {
      const error = new RemoteConfigError('Could not load local config file: src/config/remote-config.local.json');
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Initialize Remote Config
   * Must be called before fetching values
   */
  static async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('[RemoteConfig] ⚠️ Remote Config is only available on the client side');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    // Prevent multiple initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private static async _initialize(): Promise<void> {
    const env = this.getEnvironment();
    console.log(`[RemoteConfig] 🚀 Initializing (env: ${env})...`);

    if (env === 'local') {
      await this.loadLocalConfig();
      this.isInitialized = true;
      return;
    }

    try {
      // Dynamic import to avoid SSR issues
      console.log('[RemoteConfig] 📦 Importing Firebase...');
      const { remoteConfig } = await import('@choiceStoryWeb/firebase');
      
      if (!remoteConfig) {
        const error = new RemoteConfigError('Remote Config not available - Firebase not initialized');
        Sentry.captureException(error);
        throw error;
      }
      console.log('[RemoteConfig] ✅ Firebase Remote Config instance available');

      // Configure settings based on environment
      // Staging: shorter cache for faster iteration
      // Production: longer cache for better performance
      const minimumFetchIntervalMillis = env === 'staging' 
        ? 60000  // 1 minute for staging
        : 3600000; // 1 hour for production

      remoteConfig.settings = {
        minimumFetchIntervalMillis,
        fetchTimeoutMillis: 60000, // 60 second timeout
      };

      // No default config - remote config must be properly configured in Firebase Console
      // This ensures we catch configuration issues early

      // Ensure initialization is complete
      console.log('[RemoteConfig] ⏳ Ensuring initialization...');
      await ensureInitialized(remoteConfig);
      console.log('[RemoteConfig] ✅ Initialization complete');

      // Fetch and activate config
      console.log('[RemoteConfig] ⏳ Fetching and activating config...');
      const activated = await fetchAndActivate(remoteConfig);
      console.log(`[RemoteConfig] 🔄 New values activated: ${activated}`);

      // Get the JSON config for the current environment
      // Firebase has 'staging' and 'production' keys containing JSON objects
      const envConfigValue = getValue(remoteConfig, env);
      const envConfigString = envConfigValue.asString();
      
      if (!envConfigString) {
        throw new RemoteConfigError(`No config found for environment "${env}" in Firebase Remote Config`);
      }

      try {
        this.remoteConfigValues = JSON.parse(envConfigString);
        console.log(`[RemoteConfig] 📁 Loaded ${env} config`);
        console.log(`[RemoteConfig] 📋 Keys available:`, Object.values(this.remoteConfigValues!));
      } catch (parseError) {
        throw new RemoteConfigError(`Failed to parse ${env} config JSON: ${parseError}`);
      }
      
      this.isInitialized = true;

      Sentry.addBreadcrumb({
        category: 'remote-config',
        message: `Remote Config initialized (env: ${env})`,
        level: 'info',
      });
    } catch (error) {
      console.error('[RemoteConfig] ❌ Failed to initialize:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Get the config object (either local or remote)
   */
  private static getConfigObject(): LocalConfig {
    if (this.isUsingLocalConfig()) {
      if (!this.localConfig) {
        throw new RemoteConfigError('Local config not loaded');
      }
      return this.localConfig;
    }
    
    if (!this.remoteConfigValues) {
      throw new RemoteConfigError('Remote Config not loaded');
    }
    return this.remoteConfigValues;
  }

  /**
   * Get a string value from Remote Config
   * @throws RemoteConfigError if remote config is not initialized
   */
  static async getString<K extends RemoteConfigKey>(key: K): Promise<string> {
    await this.initialize();

    const config = this.getConfigObject();
    const value = config[key];
    
    if (value === undefined) {
      throw new RemoteConfigError(`Config key "${key}" not found`);
    }
    
    return String(value);
  }

  /**
   * Get a number value from Remote Config
   * @throws RemoteConfigError if remote config is not initialized
   */
  static async getNumber<K extends RemoteConfigKey>(key: K): Promise<number> {
    await this.initialize();

    const config = this.getConfigObject();
    const value = config[key];
    
    if (value === undefined) {
      throw new RemoteConfigError(`Config key "${key}" not found`);
    }
    
    return typeof value === 'number' ? value : Number(value);
  }

  /**
   * Get a boolean value from Remote Config
   * @throws RemoteConfigError if remote config is not initialized
   */
  static async getBoolean<K extends RemoteConfigKey>(key: K): Promise<boolean> {
    await this.initialize();

    const config = this.getConfigObject();
    const value = config[key];
    
    if (value === undefined) {
      throw new RemoteConfigError(`Config key "${key}" not found`);
    }
    
    return typeof value === 'boolean' ? value : Boolean(value);
  }

  /**
   * Get a JSON value from Remote Config
   * @throws RemoteConfigError if remote config is not initialized or JSON parsing fails
   */
  static async getJSON<T = unknown, K extends RemoteConfigKey = RemoteConfigKey>(key: K): Promise<T> {
    const stringValue = await this.getString(key);

    try {
      return JSON.parse(stringValue) as T;
    } catch (error) {
      throw new RemoteConfigError(`Failed to parse JSON for config key "${key}": ${error}`);
    }
  }

  /**
   * Get all config values
   */
  static async getAll(): Promise<Record<string, string>> {
    await this.initialize();

    const config = this.getConfigObject();
    return Object.fromEntries(
      Object.entries(config)
        .filter(([key]) => !key.startsWith('_')) // Filter out metadata keys
        .map(([key, value]) => [key, String(value)])
    );
  }

  /**
   * Refresh the config by fetching from server
   * Useful for forcing an update
   */
  static async refresh(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (this.isUsingLocalConfig()) {
      // Reload local config
      this.localConfig = null;
      await this.loadLocalConfig();
      return true;
    }

    try {
      const { remoteConfig } = await import('@choiceStoryWeb/firebase');
      if (!remoteConfig) return false;

      // Force fetch by setting interval to 0 temporarily
      const originalInterval = remoteConfig.settings.minimumFetchIntervalMillis;
      remoteConfig.settings.minimumFetchIntervalMillis = 0;
      
      const activated = await fetchAndActivate(remoteConfig);
      
      // Restore original interval
      remoteConfig.settings.minimumFetchIntervalMillis = originalInterval;
      
      console.log(`[RemoteConfig] 🔄 Config refreshed (activated: ${activated})`);
      return activated;
    } catch (error) {
      console.error('[RemoteConfig] Error refreshing config:', error);
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Update local config value (only works when using local config)
   * Useful for testing different config values
   */
  static setLocalValue(key: string, value: ConfigValue): void {
    if (!this.isUsingLocalConfig()) {
      console.warn('[RemoteConfig] setLocalValue only works with local config');
      return;
    }

    if (!this.localConfig) {
      this.localConfig = {};
    }
    this.localConfig[key] = value;
    console.log(`[RemoteConfig] 📝 Set local value: ${key} = ${value}`);
  }
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  // Delay initialization to not block initial render
  setTimeout(() => {
    RemoteConfigService.initialize().catch(console.error);
  }, 1000);
}
