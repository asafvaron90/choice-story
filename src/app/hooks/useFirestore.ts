import { useEffect } from 'react';
import { User } from 'firebase/auth';
import useFirestoreState from '../state/firestore.state';

export const useFirestore = (user: User | null) => {
  const { fetchAccount, fetchUsers, account, users, loading, error, reset } = useFirestoreState();

  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return;

    if (user?.email) {
      // When user logs in, fetch their account data using email
      console.log('Fetching account for email:', user.email);
      fetchAccount(user.email);
    } else {
      // When user logs out, reset the state
      reset();
    }
  }, [user?.email, fetchAccount, reset]);

  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return;

    if (account?.uid) {
      // When account is loaded, fetch associated users
      fetchUsers(account.uid);
    }
  }, [account?.uid, fetchUsers]);

  return {
    account,
    users,
    loading,
    error
  };
}; 
