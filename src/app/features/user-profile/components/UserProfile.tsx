'use client';

import { useEffect } from 'react';
import useUserData from '@/app/hooks/useUserData';
import ImageUrl from '@/app/components/common/ImageUrl';

export const UserProfile = () => {
  // Get all user-related data and actions from our custom hook
  const {
    user,
    firebaseUser,
    userData,
    isNewUser,
    isLoading,
    error,
    kids,
    hasKids,
    kidsLoaded,
    updateUser,
    refreshUserData,
    refreshKids
  } = useUserData();

  // Example of how to respond to user data changes
  useEffect(() => {
    if (isNewUser) {
      console.log('Welcome, new user! Let\'s set up your profile.');
    }
  }, [isNewUser]);

  // Handle case where user is not logged in
  if (!user) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold">You are not logged in</h2>
        <p>Please log in to view your profile</p>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold">Loading profile...</h2>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold">Error loading profile</h2>
        <p className="text-red-500">{error}</p>
        <button 
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => refreshUserData?.()}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Handle user refresh
  const handleRefresh = () => {
    if (refreshUserData) refreshUserData();
    if (refreshKids) refreshKids();
  };

  // Example of how to update user data
  const handleUpdateName = async (newName: string) => {
    if (!user || !firebaseUser) return;
    try {
      await updateUser(firebaseUser, { displayName: newName });
      console.log('Name updated successfully!');
    } catch (err) {
      console.error('Failed to update name:', err);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">User Profile</h2>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={handleRefresh}
        >
          Refresh Data
        </button>
      </div>

      {/* User info section */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex items-center gap-4">
          {userData?.photoURL && (
            <div className="relative w-16 h-16 rounded-full overflow-hidden">
              <ImageUrl 
                src={userData.photoURL} 
                alt="Profile" 
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold">{userData?.displayName || 'No Name'}</h3>
            <p className="text-gray-600">{userData?.email}</p>
          </div>
        </div>
        <div className="mt-4">
          <button 
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded"
            onClick={() => handleUpdateName(prompt('Enter new name:') || '')}
          >
            Edit Name
          </button>
        </div>
      </div>

      {/* Kids section */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-xl font-semibold mb-2">Your Kids</h3>
        
        {!kidsLoaded ? (
          <p>Loading kids data...</p>
        ) : !hasKids ? (
          <p>You haven't added any kids yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kids.map(kid => (
              <div key={kid.id} className="border p-3 rounded">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <ImageUrl 
                      src={kid.avatarUrl || '/default-avatar.png'} 
                      alt={kid.name || 'Kid profile'} 
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">{kid.name}</h4>
                    <p className="text-sm text-gray-600">
                      {kid.age} years • {kid.gender}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {kid.stories?.length} {kid.stories?.length === 1 ? 'story' : 'stories'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 