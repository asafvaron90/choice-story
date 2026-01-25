import { RemoteConfigService, RemoteConfigKey } from '@/app/services/remote-config.service';

export const BOTS_IDS = {
  AVATAR_IMAGE_AI: "pmpt_68c835fd608c81968d46482611d767b404863ae2f0e066d0",
  STORY_IMAGE_AI: "pmpt_68c842692f2481978e9b3d186cb827440e5d7cfc9430c65b",
  FULL_STORY_GENERATION_AI: "pmpt_68c9805a3288819596598b4cfc8ba6e1077ae3f79a6fa02f",
};

// Bot key to config key mapping
const BOT_CONFIG_KEYS = {
  AVATAR_IMAGE_AI: 'bot_version_avatar_image_ai',
  STORY_IMAGE_AI: 'bot_version_story_image_ai',
  FULL_STORY_GENERATION_AI: 'bot_version_full_story_generation_ai',
} as const satisfies Record<string, RemoteConfigKey>;

export type BotKey = keyof typeof BOT_CONFIG_KEYS;

/**
 * Get bot versions from Remote Config
 * @throws RemoteConfigError if remote config is not properly configured
 */
export async function getBotVersions(): Promise<{
  AVATAR_IMAGE_AI: string;
  STORY_IMAGE_AI: string;
  FULL_STORY_GENERATION_AI: string;
}> {
  const [avatarVersion, storyImageVersion, fullStoryVersion] = await Promise.all([
    RemoteConfigService.getString('bot_version_avatar_image_ai'),
    RemoteConfigService.getString('bot_version_story_image_ai'),
    RemoteConfigService.getString('bot_version_full_story_generation_ai'),
  ]);

  return {
    AVATAR_IMAGE_AI: avatarVersion,
    STORY_IMAGE_AI: storyImageVersion,
    FULL_STORY_GENERATION_AI: fullStoryVersion,
  };
}

/**
 * Get a specific bot version from Remote Config
 * @throws RemoteConfigError if remote config is not properly configured
 */
export async function getBotVersion(botKey: BotKey): Promise<string> {
  const configKey = BOT_CONFIG_KEYS[botKey];
  return RemoteConfigService.getString(configKey);
}