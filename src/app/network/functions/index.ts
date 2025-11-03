// Export all types
export type {
  StoryPagesTextRequest,
  StoryPagesTextResponse,
  StoryImagePromptRequest,
  StoryImagePromptResponse,
  KidAvatarImageRequest,
  KidAvatarImageResponse,
  StoryPageImageRequest,
  StoryPageImageResponse,
  StoryCoverImageRequest,
  StoryCoverImageResponse,
} from './FunctionClientAPI';

// Export client
export {
  FunctionClientAPI,
  getFunctionClientAPI,
  default as functionClientAPI,
} from './FunctionClientAPI';

// Export hooks
export { useFunctionClient, useAsyncFunction } from './useFunctionClient';

