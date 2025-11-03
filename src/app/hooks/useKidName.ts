import { useLanguage } from "@/app/context/LanguageContext";
import { getKidName, KidDetails, KidDetailsUtils } from "@/models";

/**
 * Hook to get a kid's name in the current language
 * Uses the language context to determine which name to display
 * 
 * @example
 * const { getLocalizedKidName, updateKidName, updateAllKidsNames } = useKidName();
 * const kidName = getLocalizedKidName(kidDetails);
 * 
 * // Or update the name property directly
 * const updatedKid = updateKidName(kidDetails);
 * console.log(updatedKid.name); // Name in current language
 */
export function useKidName() {
  const { language } = useLanguage();
  
  /**
   * Get the kid's full name in the current language context
   * @param kid The KidDetails object containing names array
   * @returns The full name in the current language
   */
  const getLocalizedKidName = (kid: KidDetails | null | undefined): string => {
    return getKidName(kid, language);
  };
  
  /**
   * Updates the 'name' property of a KidDetails object with the 
   * localized name based on the current language
   * @param kid The KidDetails object to update
   * @returns The same KidDetails object with name property set
   */
  const updateKidName = (kid: KidDetails): KidDetails => {
    return KidDetailsUtils.updateNameProperty(kid, language);
  };
  
  /**
   * Updates the 'name' property of multiple KidDetails objects
   * based on the current language context
   * @param kids Array of KidDetails objects
   * @returns The same array with updated name properties
   */
  const updateAllKidsNames = (kids: KidDetails[]): KidDetails[] => {
    return KidDetailsUtils.updateAllNamesProperties(kids, language);
  };
  
  return { 
    getLocalizedKidName,
    updateKidName,
    updateAllKidsNames
  };
} 