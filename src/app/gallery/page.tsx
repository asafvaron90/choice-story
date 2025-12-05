"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import useKidsState from "@/app/state/kids-state";
import { useTranslation } from "@/app/hooks/useTranslation";
import { Header } from "@/app/components/common/Header";
import { StoryApi } from "@/app/network/StoryApi";
import { Story, KidDetails } from "@/models";
import { StoryActionsModal } from "@/app/components/modals/StoryActionsModal";
import ImageUrl from "@/app/components/common/ImageUrl";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { getAuth } from "firebase/auth";

// Extended kid type with sharing info
interface KidWithShareInfo extends KidDetails {
  isShared?: boolean;
  sharedBy?: string;
  permission?: 'read' | 'write';
}

export default function GalleryPage() {
  const { t } = useTranslation();
  const { currentUser, googleSignIn, loading: authLoading } = useAuth();
  const { kids: ownedKids, isLoading: kidsLoading, fetchKids } = useKidsState();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sharedKids, setSharedKids] = useState<KidWithShareInfo[]>([]);
  const [sharedKidsLoading, setSharedKidsLoading] = useState(false);
  
  // Refs to prevent duplicate fetches
  const hasFetchedOwnedKids = useRef(false);
  const hasFetchedSharedKids = useRef(false);

  // Combine owned and shared kids - use useMemo to prevent recreation
  const allKids = useMemo<KidWithShareInfo[]>(() => [
    ...ownedKids.map(kid => ({ ...kid, isShared: false })),
    ...sharedKids
  ], [ownedKids, sharedKids]);

  // Check URL params for kidId on mount
  useEffect(() => {
    const kidIdParam = searchParams.get("kidId");
    if (kidIdParam) {
      setSelectedKidId(kidIdParam);
    }
  }, [searchParams]);

  // Fetch owned kids - only once
  useEffect(() => {
    if (currentUser && !hasFetchedOwnedKids.current && !kidsLoading) {
      hasFetchedOwnedKids.current = true;
      fetchKids(currentUser.uid);
    }
  }, [currentUser, kidsLoading, fetchKids]);

  // Fetch shared kids - only once
  useEffect(() => {
    const fetchSharedKids = async () => {
      if (!currentUser || hasFetchedSharedKids.current) return;
      
      hasFetchedSharedKids.current = true;
      setSharedKidsLoading(true);
      
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        
        if (!token) {
          console.error('No auth token available');
          setSharedKidsLoading(false);
          return;
        }
        
        const response = await fetch('/api/user/kids/shared', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const result = await response.json();
        
        if (result.success && result.kids) {
          const mappedKids: KidWithShareInfo[] = result.kids.map((item: { kid: KidDetails; permission: 'read' | 'write'; sharedBy: string }) => ({
            ...item.kid,
            isShared: true,
            sharedBy: item.sharedBy,
            permission: item.permission,
          }));
          setSharedKids(mappedKids);
          console.log(`[Gallery] Loaded ${mappedKids.length} shared kids`);
        } else {
          // API returned error, but we continue with empty shared kids
          console.warn('[Gallery] Could not load shared kids:', result.error);
          setSharedKids([]);
        }
      } catch (error) {
        // Network error or other issue - continue with empty shared kids
        console.error('Error fetching shared kids:', error);
        setSharedKids([]);
      } finally {
        setSharedKidsLoading(false);
      }
    };
    
    fetchSharedKids();
  }, [currentUser]);

  // Fetch stories when a kid is selected
  useEffect(() => {
    const fetchStoriesForKid = async () => {
      if (!selectedKidId || !currentUser) return;

      // Find the selected kid to get the correct accountId
      // Use refs or combine from current state to avoid dependency issues
      const kid = [...ownedKids, ...sharedKids].find(k => k.id === selectedKidId);
      
      // Use the kid's accountId (owner's ID) for fetching stories, fallback to current user
      const accountIdForStories = kid?.accountId || currentUser.uid;

      setStoriesLoading(true);
      try {
        console.log(`[Gallery] Fetching stories for kid ${selectedKidId} with accountId ${accountIdForStories}`);
        const response = await StoryApi.getStoriesByKid(accountIdForStories, selectedKidId);
        if (response.success && response.data) {
          setStories(response.data.stories || []);
        } else if (!response.success) {
          console.error("Failed to fetch stories:", response.error);
          setStories([]);
        } else {
          setStories([]);
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
        setStories([]);
      } finally {
        setStoriesLoading(false);
      }
    };

    fetchStoriesForKid();
  }, [selectedKidId, currentUser, ownedKids, sharedKids]);

  const handleKidClick = useCallback((kidId: string) => {
    setSelectedKidId(kidId);
    router.push(`/gallery?kidId=${kidId}`, { scroll: false });
  }, [router]);

  const handleBackToKids = useCallback(() => {
    setSelectedKidId(null);
    setStories([]);
    router.push("/gallery", { scroll: false });
  }, [router]);

  const handleStoryClick = useCallback((story: Story) => {
    setSelectedStory(story);
    setIsModalOpen(true);
  }, []);

  // Get kid details for header
  const selectedKid = allKids.find(kid => kid.id === selectedKidId);
  
  // Combined loading state
  const isLoadingKids = kidsLoading || sharedKidsLoading;

  // Not authenticated
  if (!currentUser && !authLoading) {
    return (
      <>
        <Header />
        <div className="flex flex-col items-center justify-center min-h-screen pt-16">
          <h1 className="text-2xl font-bold mb-4">{t.gallery.loginPrompt}</h1>
          <Button
            onClick={googleSignIn}
            className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all px-8 py-6 text-lg"
          >
            {t.gallery.loginButton}
          </Button>
        </div>
      </>
    );
  }

  // Loading state
  if (authLoading || isLoadingKids) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8 mt-16 max-w-6xl">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 mt-16 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {selectedKidId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToKids}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-3xl font-bold text-gray-800">
              {selectedKidId 
                ? `${selectedKid?.name || t.userCard.unnamedKid} - ${t.userCard.storiesTitle}`
                : t.gallery.title
              }
            </h1>
          </div>
        </div>

        {/* Kids View */}
        {!selectedKidId && (
          <>
            {allKids.length === 0 ? (
              <div className="text-center py-12 px-6 bg-white rounded-xl shadow-sm">
                <p className="text-gray-500 mb-8">{t.dashboard.noKids}</p>
                <Button
                  onClick={() => router.push("/create-a-kid")}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all px-8"
                >
                  {t.dashboard.addKid}
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Owned Kids Section */}
                {ownedKids.length > 0 && (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {ownedKids.map((kid) => (
                        <motion.div
                          key={kid.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleKidClick(kid.id)}
                          className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer p-6"
                        >
                          <div className="flex flex-col items-center">
                            <div className="relative h-32 w-32 rounded-full overflow-hidden mb-4 bg-gray-100">
                              <ImageUrl
                                src={kid.kidSelectedAvatar || kid.avatarUrl || "/images/boy-placeholder.svg"}
                                alt={kid.name || t.userCard.unnamedKid}
                                fill
                                className="object-cover"
                                sizes="128px"
                              />
                            </div>
                            <h2 className="text-xl font-bold text-center mb-2">
                              {kid.name || t.userCard.unnamedKid}
                            </h2>
                            <div className="flex gap-4 text-sm text-gray-600 mb-4">
                              <span>{kid.age} {t.userCard.years}</span>
                              <span>{kid.gender === "male" ? t.userCard.male : t.userCard.female}</span>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleKidClick(kid.id);
                              }}
                            >
                              {t.gallery.viewStories}
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared Kids Section */}
                {sharedKids.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Shared with me
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sharedKids.map((kid) => (
                        <motion.div
                          key={kid.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleKidClick(kid.id)}
                          className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-blue-200 cursor-pointer p-6"
                        >
                          <div className="flex flex-col items-center">
                            <div className="relative h-32 w-32 rounded-full overflow-hidden mb-4 bg-gray-100">
                              <ImageUrl
                                src={kid.kidSelectedAvatar || kid.avatarUrl || "/images/boy-placeholder.svg"}
                                alt={kid.name || t.userCard.unnamedKid}
                                fill
                                className="object-cover"
                                sizes="128px"
                              />
                            </div>
                            <h2 className="text-xl font-bold text-center mb-2">
                              {kid.name || t.userCard.unnamedKid}
                            </h2>
                            <div className="flex gap-4 text-sm text-gray-600 mb-4">
                              <span>{kid.age} {t.userCard.years}</span>
                              <span>{kid.gender === "male" ? t.userCard.male : t.userCard.female}</span>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleKidClick(kid.id);
                              }}
                            >
                              {t.gallery.viewStories}
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Stories View */}
        {selectedKidId && (
          <>
            {storiesLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            ) : stories.length === 0 ? (
              <div className="text-center py-12 px-6 bg-white rounded-xl shadow-sm">
                <p className="text-gray-500 mb-8">{t.gallery.noStoriesYet}</p>
                <Button
                  onClick={() => router.push(`/create-a-story/${selectedKidId}`)}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all px-8"
                >
                  {t.userCard.createStory}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((story) => (
                  <motion.div
                    key={story.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStoryClick(story)}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer"
                  >
                    <div className="relative aspect-video bg-gray-100">
                      {story.pages?.[0]?.selectedImageUrl ? (
                        <ImageUrl
                          src={story.pages[0].selectedImageUrl}
                          alt={story.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100">
                          <span className="text-4xl">📖</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                        {story.title}
                      </h3>
                      {story.problemDescription && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {story.problemDescription}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Story Actions Modal */}
      {selectedStory && (
        <StoryActionsModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          story={selectedStory}
        />
      )}
    </>
  );
}

