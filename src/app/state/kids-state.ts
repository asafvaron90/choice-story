import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { KidApi } from '@/app/network/KidApi';
import { KidDetails } from '@/models';
import { logger } from '@/lib/logger';

// Helper function to ensure KidDetails has required fields and valid data types
const ensureValidKid = (kid: KidDetails): KidDetails => {
  // Validate and clean names array
  const validNames = kid.names?.map(name => ({
    firstName: typeof name.firstName === 'string' ? name.firstName : '',
    lastName: typeof name.lastName === 'string' ? name.lastName : '',
    languageCode: name.languageCode || 'he'
  })) || [];

  // Log warning if we found invalid name data
  if (kid.names) {
    kid.names.forEach((name, index) => {
      if (typeof name.firstName !== 'string') {
        console.warn(`⚠️ Invalid firstName for kid ${kid.id}, name[${index}]:`, name.firstName);
      }
      if (typeof name.lastName !== 'string') {
        console.warn(`⚠️ Invalid lastName for kid ${kid.id}, name[${index}]:`, name.lastName);
      }
    });
  }

  return {
    ...kid,
    id: kid.id || '',
    avatarUrl: kid.avatarUrl || '',
    imageAnalysis: kid.imageAnalysis || '',
    names: validNames,
    // Ensure name property is a string if it exists
    name: typeof kid.name === 'string' ? kid.name : undefined
  };
};

interface KidsState {
  // State
  kids: KidDetails[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Actions
  setKids: (kids: KidDetails[]) => void;
  clearKids: () => void;
  updateLastFetched: () => void;
  
  // Fetch actions
  fetchKids: (accountId: string, user?: FirebaseUser | null) => Promise<KidDetails[]>;
  fetchKidById: (kidId: string, user?: FirebaseUser | null) => Promise<KidDetails | null>;
  deleteKid: (kidId: string, user?: FirebaseUser | null) => Promise<boolean>;
}

// Cache duration in milliseconds (15 minutes)
const CACHE_DURATION = 15 * 60 * 1000;

// Helper function to log kids for debugging
const logKidsState = (kids: KidDetails[]) => {
  console.log("Kids state updated:", kids.length, kids);
};

const useKidsState = create<KidsState>((set, get) => ({
  // Initial state
  kids: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  
  // Basic state setters
  setKids: (kids) => {
    logKidsState(kids);
    set({ kids, lastFetched: Date.now(), error: null });
  },
  clearKids: () => set({ kids: [], lastFetched: null, error: null, isLoading: false }),
  updateLastFetched: () => set({ lastFetched: Date.now() }),
  
  // Fetch all kids for an account
  fetchKids: async (accountId, _user) => {
    const { kids, lastFetched } = get();

    try {
      // Stale-while-revalidate: return cached data immediately if available
      if (lastFetched && kids.length > 0) {
        console.log('Using cached kids data:', kids);
        set({ isLoading: false });

        // If cache is stale, refresh in background
        if (Date.now() - lastFetched > CACHE_DURATION) {
          console.log('Cache is stale, refreshing in background...');
          // Don't await - fetch in background
          KidApi.getKids(accountId).then(response => {
            if (response.success && response.data?.success) {
              const fetchedKids = response.data.kids.map(ensureValidKid);
              logKidsState(fetchedKids);
              set({
                kids: fetchedKids,
                lastFetched: Date.now(),
                error: null
              });
            }
          }).catch(error => {
            console.error('Background refresh failed:', error);
          });
        }

        return kids;
      }

      // No cache - show loading and fetch
      set({ isLoading: true, error: null });

      const response = await KidApi.getKids(accountId);

      if (!response.success) {
        throw new Error(response.error);
      }

      if (!response.data?.success) {
        throw new Error('Failed to load kids data');
      }

      // Map API KidDetails to Kid type with required fields
      const fetchedKids = response.data.kids.map(ensureValidKid);
      logKidsState(fetchedKids);

      set({
        kids: fetchedKids,
        lastFetched: Date.now(),
        isLoading: false,
        error: null
      });

      return fetchedKids;
    } catch (error) {
      console.error('Error fetching kids:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch kids',
        isLoading: false
      });
      return kids; // Return current kids on error
    }
  },
  
  // Fetch a single kid by ID
  fetchKidById: async (kidId, _user) => {
    try {
      set({ isLoading: true, error: null });
      
      // First check if we already have this kid in state
      const { kids, lastFetched } = get();
      const cachedKid = kids.find(kid => kid.id === kidId);
      
      if (
        cachedKid && 
        lastFetched && 
        Date.now() - lastFetched < CACHE_DURATION
      ) {
        console.log('Using cached kid data:', cachedKid);
        set({ isLoading: false });
        return cachedKid;
      }
      
      // If not in cache or cache is stale, fetch from API using KidApi
      const response = await KidApi.getKidById(kidId);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      if (!response.data?.success) {
        throw new Error('Failed to load kid data');
      }
      
      // Map API KidDetails to Kid type
      const fetchedKid = ensureValidKid(response.data.kid);
      console.log('Fetched kid data:', fetchedKid);
      
      // Check if avatarUrl exists on the fetched kid
      if (!fetchedKid.avatarUrl) {
        console.warn(`⚠️ Kid ${fetchedKid.id} (${fetchedKid.name}) is missing avatarUrl!`);
      }
      
      // Update local state to include this kid
      const existingKids = get().kids.filter(k => k.id !== kidId);
      const updatedKids = [...existingKids, fetchedKid];
      
      logKidsState(updatedKids);
      
      set({ 
        kids: updatedKids,
        isLoading: false,
        error: null
      });
      
      return fetchedKid;
    } catch (error) {
      logger.error({
        message: 'Error fetching kid',
        error,
        context: { kidId }
      });
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch kid',
        isLoading: false 
      });
      return null;
    }
  },
  
  // Delete a kid
  deleteKid: async (kidId, _user) => {
    try {
      set({ isLoading: true, error: null });
      
      // Delete kid using KidApi
      const response = await KidApi.deleteKid(kidId);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      if (!response.data?.success) {
        throw new Error('Failed to delete kid');
      }
      
      // Update local state to remove this kid
      const updatedKids = get().kids.filter(kid => kid.id !== kidId);
      logKidsState(updatedKids);
      
      set({ 
        kids: updatedKids,
        isLoading: false,
        error: null
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting kid:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete kid',
        isLoading: false 
      });
      return false;
    }
  }
}));

export default useKidsState; 