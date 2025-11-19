'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { RefreshCw } from 'lucide-react';
import * as Sentry from "@sentry/nextjs";
import useUserData from '../hooks/useUserData';
import useKidsState from '../state/kids-state';
import { UserCard } from '../features/user-profile/components/user-card/UserCard';
import { useTranslation } from '../hooks/useTranslation';

export default function Dashboard() {
  const { t } = useTranslation();
  const { 
    kids, 
    error, 
    refreshKids,
    deleteKid,
    kidsLoaded  // This tells us if we've fetched kids data at least once
  } = useUserData();
  
  // Get kids-specific loading state and data
  const { isLoading: isLoadingKids } = useKidsState();
  
  const router = useRouter();
 
  // Fetch kids if they haven't been loaded yet
  useEffect(() => {
    if (!kidsLoaded && refreshKids) {
      refreshKids();
    }
  }, [kidsLoaded, refreshKids]);

  // Determine if we should show loading state
  // Show loading if: currently loading OR we haven't loaded kids yet
  const showLoading = isLoadingKids || !kidsLoaded;
 
  // Track initial load performance
  useEffect(() => {
    if (kids.length > 0 && !isLoadingKids) {
      Sentry.startSpan(
        {
          op: "ui.load",
          name: "Dashboard Kids Loaded",
        },
        (span) => {
          span.setAttribute("kids_count", kids.length.toString());
          span.setAttribute("load_type", "initial");
        },
      );
    }
  }, [kids.length, isLoadingKids]);

  // Removed auto-refresh on focus/navigation to prevent excessive API calls
  // Users can manually refresh using the refresh button if needed

  const handleAddKid = () => {
    router.push('/create-a-kid');
  };

  const handleKidDeleted = async (kidId?: string) => {
    if (!kidId || !deleteKid) return;
    
    console.log('Kid deleted, refreshing dashboard...', kidId);
    
    try {
      // First use the Zustand deleteKid function which updates local state immediately
      const success = await deleteKid(kidId);
      
      if (success) {
        console.log('Kid deleted successfully.');
        
        // Perform an additional refresh after a short delay to ensure backend changes propagate
        setTimeout(() => {
          console.log('Performing secondary refresh to ensure data consistency...');
          if (refreshKids) {
            refreshKids();
          }
          
          // Force router refresh for a complete UI update
          router.refresh();
        }, 800);
      } else {
        console.error('Failed to delete kid.');
        
        // If deletion failed in the state, do a full refresh to ensure consistent state
        if (refreshKids) {
          refreshKids();
        }
      }
    } catch (error) {
      console.error('Error in handleKidDeleted:', error);
      // Refresh kids list to ensure UI is in sync
      if (refreshKids) {
        refreshKids();
      }
    }
  };

  const handleRefresh = () => {
    if (refreshKids) {
      Sentry.startSpan(
        {
          op: "ui.click",
          name: "Dashboard Manual Refresh",
        },
        (span) => {
          span.setAttribute("action", "manual_refresh");
          span.setAttribute("kids_count", kids.length.toString());
          refreshKids();
        },
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-16 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{t.dashboard.title}</h1>
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoadingKids}
            className={`${isLoadingKids ? 'animate-spin' : ''} rounded-full`}
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
            <Button
              id='add-kid-button-top-left'
              onClick={handleAddKid}
              className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              {t.dashboard.addKid}
            </Button>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        {showLoading ? (
          // Loading placeholders
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
                <div className="p-5">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <div className="w-full">
                      <div className="h-5 bg-gray-200 w-28 mx-auto mb-2 rounded-full"></div>
                      <div className="h-4 bg-gray-100 w-20 mx-auto mb-4 rounded-full"></div>
                      <div className="flex justify-center gap-3">
                        <div className="h-8 w-20 bg-gray-100 rounded-full"></div>
                        <div className="h-8 w-20 bg-gray-100 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <div className="h-4 bg-gray-100 rounded-full mb-2"></div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-md"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 px-6 bg-white rounded-xl shadow-sm">
            <div className="text-red-500 mb-4">{error}</div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="rounded-full"
            >
              {t.dashboard.tryAgain}
            </Button>
          </div>
        ) : kids.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 mb-8">{t.dashboard.noKids}</p>
            <Button
              onClick={handleAddKid}
              className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all px-8"
            >
              {t.dashboard.addKid}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min content-start">
              {kids.map((kid) => {
              
                
                return (
                  <div key={kid.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
                    <UserCard
                      kid={kid}
                      onDelete={handleKidDeleted}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Add kid floating button for mobile */}
            <div className="fixed bottom-6 right-6 sm:hidden z-50">
              <Button
                onClick={handleAddKid}
                className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </Button>
            </div>
            
            {isLoadingKids && (
              <div className="fixed bottom-6 left-6 bg-black/90 text-white px-4 py-2 rounded-full shadow-md z-50">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>{t.dashboard.refreshing}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 