import { useLanguage } from "@/app/context/LanguageContext";
import { KidDetails } from "@/models";
import { firestoreService } from "@/app/services/firestore.service";
import { processKidDetails, processKidDetailsArray } from "../middleware/kidDetailsMiddleware";
import { useCallback } from "react";

/**
 * A hook that provides KidDetails-related services with automatic name property handling
 * All methods automatically apply the name property based on the current language
 */
export function useKidDetailsService() {
  const { language } = useLanguage();
  
  /**
   * Get a kid's details by ID with name property populated
   */
  const getKid = useCallback(async (userId: string, kidId: string) => {
    const kidDetails = await firestoreService.getKid(userId, kidId);
    return processKidDetails(kidDetails, language);
  }, [language]);
  
  /**
   * Get all kids for a user with name properties populated
   */
  const getKids = useCallback(async (userId: string) => {
    const kids = await firestoreService.getKids(userId);
    return processKidDetailsArray(kids, language);
  }, [language]);
  
  /**
   * Save a kid's details, ensuring name property is set correctly on return
   */
  const saveKid = useCallback(async (userId: string, kidDetails: KidDetails, avatarUrl?: string) => {
    // Save the kid details
    const kidId = await firestoreService.saveKid(userId, kidDetails, avatarUrl);
    
    // Fetch the updated kid details to get the complete object back
    if (kidId) {
      return getKid(userId, kidId);
    }
    
    return null;
  }, [getKid]);

  return {
    getKid,
    getKids,
    saveKid
  };
} 