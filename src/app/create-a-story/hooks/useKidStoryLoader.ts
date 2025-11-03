import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import useCreateStoryProgressState from "../state/progress-state";
import useCreateStoryState from "../state/create-story-state";
import useKidsState from "@/app/state/kids-state";
import { KidDetails } from "@/models";
import { toast } from "@/components/ui/use-toast";

export function useKidStoryLoader(kidId: string | null | undefined) {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const { kids, fetchKids, fetchKidById, isLoading: kidsLoading, error: kidsError } = useKidsState();
  const { reset: resetProgressState } = useCreateStoryProgressState();
  const { setKidDetails, reset: resetStoryState, kidDetails: existingKidDetails } = useCreateStoryState();

  const [error, setError] = useState<string | null>(null);
  const [kid, setKid] = useState<KidDetails | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Memoize the load function to prevent unnecessary re-renders
  const loadKidDetails = useCallback(async () => {
    // Don't do anything while auth is loading
    if (authLoading) {
      return;
    }

    // Check auth after it's done loading
    if (!currentUser) {
      setError("You must be logged in to create a story.");
      return;
    }

    // Prevent duplicate loading if we already have the correct kid loaded
    if (hasLoaded && kidId && existingKidDetails?.id === kidId) {
      return;
    }

    try {
      console.log(`[useKidStoryLoader] Attempting to load kid details. kidId: ${kidId}, currentUser.uid: ${currentUser?.uid}`);
      
      // Only reset state if we're loading a different kid
      if (kidId && kidId !== existingKidDetails?.id) {
        resetProgressState();
        resetStoryState();
      }

      if (kidId) {
        console.log(`[useKidStoryLoader] Fetching kid details for kidId: ${kidId}`);
        const fetchedKid = await fetchKidById(currentUser.uid, kidId);

        if (!fetchedKid) {
          toast({
            title: "Error",
            description: "Kid details not found. Please select a valid kid.",
            variant: "destructive"
          });
          setError("Kid details not found. Please select a valid kid.");
          return;
        }

        // Ensure required fields are present
        if (!fetchedKid.age) {
          console.warn(`[useKidStoryLoader] Kid ${fetchedKid.id} is missing age, using default age 5`);
          fetchedKid.age = 5;
        }

        if (!fetchedKid.name) {
          console.warn(`[useKidStoryLoader] Kid ${fetchedKid.id} is missing name`);
          toast({
            title: "Warning",
            description: "Kid name is missing. Some features may be limited.",
            variant: "destructive"
          });
        }

        if (!fetchedKid.gender) {
          console.warn(`[useKidStoryLoader] Kid ${fetchedKid.id} is missing gender`);
          toast({
            title: "Warning",
            description: "Kid gender is missing. Some features may be limited.",
            variant: "destructive"
          });
        }

        setKid(fetchedKid);
        setKidDetails(fetchedKid);
        setHasLoaded(true);
        
        console.log('[useKidStoryLoader] After setting kidDetails in state:', {
          id: fetchedKid.id,
          name: fetchedKid.name,
          age: fetchedKid.age,
          gender: fetchedKid.gender
        });

        return;
      }

      if (existingKidDetails?.id) {
        router.replace(`/create-a-story/${existingKidDetails.id}`);
        return;
      }

      if (kids.length === 0) {
        await fetchKids(currentUser.uid);
      }

      if (kids.length > 0) {
        router.replace(`/create-a-story/${kids[0].id}`);
      } else {
        toast({
          title: "No Kids Found",
          description: "You don't have any kids yet. Please create a kid first.",
          variant: "destructive"
        });
        setError("You don't have any kids yet. Please create a kid first.");
        setTimeout(() => {
          router.push('/create-a-kid');
        }, 2000);
      }
    } catch (err) {
      console.error("[useKidStoryLoader] Error loading kid details:", err);
      toast({
        title: "Error",
        description: "Failed to load kid details. Please try again.",
        variant: "destructive"
      });
      setError("Failed to load kid details. Please try again.");
    }
  }, [
    authLoading,
    currentUser?.uid,
    kidId,
    existingKidDetails?.id,
    hasLoaded,
    fetchKidById,
    setKidDetails,
    resetProgressState,
    resetStoryState,
    router,
    fetchKids,
    kids.length
  ]);

  // Memoize the key dependencies to prevent unnecessary effect runs
  const currentUserId = useMemo(() => currentUser?.uid, [currentUser?.uid]);
  const existingKidId = useMemo(() => existingKidDetails?.id, [existingKidDetails?.id]);

  useEffect(() => {
    // Reset hasLoaded when kidId changes
    if (kidId !== existingKidId) {
      setHasLoaded(false);
    }

    // Only attempt to load if we have a kidId and auth is not loading
    if (kidId && !authLoading && currentUserId) {
      loadKidDetails();
    }
  }, [kidId, authLoading, currentUserId, loadKidDetails, existingKidId]);

  // Use the error from kids state if available
  const finalError = kidsError || error;

  return { 
    loading: authLoading || kidsLoading, 
    error: finalError, 
    kid, 
    router 
  };
} 