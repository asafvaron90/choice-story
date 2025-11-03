/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Use StorageService from src/app/services/storage.service.ts instead.
 */

/**
 * @deprecated Use StorageService directly
 */
export const getStoryStorageBasePath = () => {
  console.warn("getStoryStorageBasePath is deprecated");
  throw new Error('This function is deprecated. Use StorageService instead.');
};

/**
 * @deprecated Use StorageService directly
 */
export const getStoryImagePath = () => {
  console.warn("getStoryImagePath is deprecated");
  throw new Error('This function is deprecated. Use StorageService instead.');
};

/**
 * @deprecated Use StorageService directly
 */
export const getStoryImageUrl = () => {
  console.warn("getStoryImageUrl is deprecated");
  throw new Error('This function is deprecated. Use StorageService instead.');
};

/**
 * @deprecated Use StorageService directly
 */
export const getImageFromStorage = () => {
  console.warn("getImageFromStorage is deprecated");
  throw new Error('This function is deprecated. Use StorageService instead.');
};

/**
 * @deprecated This function is deprecated
 */
export const getSessionId = (): string => {
  console.warn("getSessionId is deprecated");
  return '';
};

/**
 * @deprecated This function is deprecated
 */
export const uploadImage = async () => {
  console.warn("uploadImage is deprecated");
  throw new Error('This function is deprecated. Use StorageService instead.');
};

/**
 * @deprecated This function is deprecated
 */
export const uploadBase64Image = async () => {
  console.warn("uploadBase64Image is deprecated");
  throw new Error('This function is deprecated. Use StorageService instead.');
}; 