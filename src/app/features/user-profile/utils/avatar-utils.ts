import { Gender } from '@/models';

/**
 * Returns a placeholder avatar URL based on the gender
 */
export const getPlaceholderAvatar = (gender: Gender): string => {
  switch (gender) {
    case Gender.male:
      return '/images/avatars/default-boy.png';
    case Gender.female:
      return '/images/avatars/default-girl.png';
    default:
      return '/images/avatars/default-neutral.png';
  }
}; 