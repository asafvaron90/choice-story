export const PLACEHOLDER_IMAGE = '/illustrations/STORY_COVER.svg';
export const getImageUrl = (url: string | null | undefined): string => url || PLACEHOLDER_IMAGE; 