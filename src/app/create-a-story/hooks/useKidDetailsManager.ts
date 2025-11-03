import { useEffect, useCallback } from 'react';
import { toast } from "@/components/ui/use-toast";
import useKidsState from "@/app/state/kids-state";
import useCreateStoryState from "../state/create-story-state";
import { KidDetails, Gender } from '@/models';

/**
 * Custom hook to manage kid details validation and loading
 */
export function useKidDetailsManager(userId: string | null | undefined, kidId: string | null | undefined) {
  const { fetchKidById } = useKidsState();
  const { kidDetails, setKidDetails } = useCreateStoryState();

  // Load kid details from URL parameter if needed
  useEffect(() => {
    const loadKidDetails = async () => {
      // Skip if missing essential information or already loaded
      if (!userId || !kidId) {
        return;
      }

      // Skip if we already have complete kid details for this specific kid
      if (kidDetails?.id === kidId && 
          kidDetails.age && 
          kidDetails.name && 
          kidDetails.gender) {
        return;
      }

      try {
        const fetchedKid = await fetchKidById(userId, kidId);
        
        if (fetchedKid) {
          // Set the complete kid details in state
          setKidDetails(fetchedKid);
          
          // Show notification if we had to reload
          if (kidDetails?.id !== kidId) {
            toast({
              title: "Kid Details Loaded",
              description: `Loaded details for ${fetchedKid.name}`,
            });
          }
        } else {
          toast({
            title: "Warning",
            description: "Could not load kid details. Some features may be limited.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching kid details:", error);
      }
    };

    loadKidDetails();
  }, [userId, kidId, kidDetails, fetchKidById, setKidDetails]);

  const ensureKidDetails = useCallback(async (): Promise<KidDetails | null> => {
    if (!userId || !kidId) {
      return null;
    }

    try {
      const fetchedKid = await fetchKidById(userId, kidId);
      
      if (fetchedKid) {
        // Set the complete kid details in state
        setKidDetails(fetchedKid);
        return fetchedKid;
      }
      
      // If we still have missing properties, use defaults
      const safeKidDetails: KidDetails = {
        id: kidId,
        names: kidDetails?.names || [],
        name: kidDetails?.name || "Child",
        gender: kidDetails?.gender || Gender.male,
        age: kidDetails?.age || 5,
        imageAnalysis: kidDetails?.imageAnalysis || "",
        avatarUrl: kidDetails?.avatarUrl || "",
        stories: kidDetails?.stories || [],
        createdAt: kidDetails?.createdAt || new Date(),
        lastUpdated: kidDetails?.lastUpdated || new Date(),
      };
      
      setKidDetails(safeKidDetails);
      return safeKidDetails;
    } catch (error) {
      console.error("Error fetching kid details:", error);
      return null;
    }
  }, [userId, kidId, kidDetails, fetchKidById, setKidDetails]);

  return {
    kidDetails,
    ensureKidDetails
  };
} 