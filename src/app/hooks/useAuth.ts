import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '../../../firebase';
import { logger } from '@/lib/logger';
import { useUserData } from './useUserData';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { userData } = useUserData();

  useEffect(() => {
    if (!app) {
      logger.error({ message: 'Firebase app is not initialized' });
      setLoading(false);
      return;
    }
    
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (user && userData) {
        logger.setUser(userData.uid, user.uid);
      } else {
        logger.setUser(); // Clear user info on logout
      }
    });

    return () => unsubscribe();
  }, [app, userData]);

  return { user, loading };
}