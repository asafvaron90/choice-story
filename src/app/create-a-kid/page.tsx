"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import useCreateKidState from "./state/create-kid-state";
import KidDetailsContent from "../create-a-kid/components/KidDetailsContent";
import ImageUploadContent from "../create-a-kid/components/ImageUploadContent";
// Removed AvatarGenerationContent - avatar generation step removed
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/app/context/LanguageContext";
import { translations } from "@/app/translations";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import useKidsState from "../state/kids-state";
import { UploadService } from "@/app/services/upload.service";
import StepAccordionItem from "@/components/ui/accordion";
import { KidApi } from "@/app/network/KidApi";
import { KidDetails, ApiErrorResponse } from "@/models";

export default function CreateAKidPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language];
  const { kidDetails, setKidDetails, currentImageUrl, currentImageBase64: _currentImageBase64, imageRequirements, isComplete, setIsComplete, selectedImageFile } = useCreateKidState((state) => state);
  const { setKids } = useKidsState();
  const { currentUser } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const [_isLoading, _setIsLoading] = useState(false);
  const [isKidDetailsDone, setIsKidDetailsDone] = useState(false);
  const [_isImageUploadDone, setIsImageUploadDone] = useState(false);
  const [isImageValidationDone, setIsImageValidationDone] = useState(false);
  // Removed isAvatarStepDone - avatar generation step removed
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize kid details when component mounts
  useEffect(() => {
    if (!kidDetails) {
      setKidDetails({
        id: '',
        names: [],
        name: '',
        age: 0,
        gender: 'male',
        stories: [],
        createdAt: new Date(),
        lastUpdated: new Date()
      } as KidDetails);
    }
  }, [kidDetails, setKidDetails]);

  useEffect(() => {
    // Check if kid details are completed
    const kidDetailsComplete = !!kidDetails?.name && !!kidDetails?.age && !!kidDetails?.gender;
    setIsKidDetailsDone(kidDetailsComplete);
    
    // Check if image upload is completed and validated
    setIsImageUploadDone(!!currentImageUrl && !!imageRequirements?.isValid);
    setIsImageValidationDone(!!currentImageUrl && !!imageRequirements?.isValid);
    
    // If kid details are complete and step 0 is expanded, move to step 1
    if (kidDetailsComplete && expandedSteps.includes(0) && !expandedSteps.includes(1)) {
      // Short delay to ensure animations look smooth
      const timer = setTimeout(() => {
        setExpandedSteps([1]);
        setActiveStep(1);
      }, 300);
      return () => clearTimeout(timer);
    }
    
    // If the kid creation process is complete, redirect to dashboard
    if (isComplete && kidDetails?.id && currentUser) {
      toast({
        title: t.createKid.success.created,
        description: t.createKid.success.redirecting,
        duration: 3000,
      });
      
      // Refresh kids data before redirecting
      const refreshKids = async () => {
        try {
          // Get updated kids list using KidApi
          const response = await KidApi.getKids(currentUser.uid);
          
          if (!response.success) {
            throw new Error('Failed to fetch kids data: ' + (response as ApiErrorResponse).error);
          }
          
          if (!response.data) {
            throw new Error('Failed to fetch kids data: No data returned');
          }
          
          // Update the kids state
          if (response.data.kids) {
            // Ensure each kid has required fields
            const validKids = response.data.kids.map((kid: KidDetails) => ({
              ...kid,
              id: kid.id || '',
              avatarUrl: kid.avatarUrl || '',
              names: kid.names || [],
              name: kid.name || '',
              age: kid.age || 0,
              gender: kid.gender || 'male',
              stories: kid.stories || [],
              createdAt: kid.createdAt || new Date(),
              lastUpdated: kid.lastUpdated || new Date()
            }));
            setKids(validKids);
          }
          
          // After showing the success message and refreshing data, redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard');
            // Reset the create-kid state after navigation
            setTimeout(() => {
              useCreateKidState.getState().reset();
            }, 500);
          }, 1000);
        } catch (error) {
          console.error("Error refreshing kids data:", error);
          // Still redirect even if there's an error
          router.push('/dashboard');
        }
      };
      
      refreshKids();
      
      return;
    }
  }, [isComplete, kidDetails, router, currentUser, currentImageUrl, imageRequirements, expandedSteps, setKids, t]);

  // Removed avatar step completion logic - avatar generation step removed

  // Add a cleanup effect to reset state when component unmounts
  useEffect(() => {
    return () => {
      // Only reset if not completed successfully (to prevent race condition with redirect)
      if (!isComplete) {
        useCreateKidState.getState().reset();
      }
    };
  }, [isComplete]);

  const handleStepToggle = (index: number) => {
    setExpandedSteps(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
    setActiveStep(index);
  };

  const handleSaveKid = async () => {
    if (!currentUser || !kidDetails?.name || !kidDetails?.gender || !kidDetails?.age || !currentImageUrl || !imageRequirements?.isValid) {
      setError(t.createKid.error.incomplete);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      let uploadedImageUrl = currentImageUrl;
      
      // If we have a selected image file, upload it to Firebase Storage
      if (selectedImageFile) {
        const storagePath = UploadService.generateKidImagePath(currentUser.uid, kidDetails.name);
        uploadedImageUrl = await UploadService.uploadFile(selectedImageFile, storagePath);
        console.log("Image uploaded to Firebase:", uploadedImageUrl);
      }

      // Save kid using KidApi
      const kidDetailsToSave: KidDetails = {
        id: kidDetails.id,
        names: kidDetails.names,
        age: kidDetails.age,
        gender: kidDetails.gender,
        stories: kidDetails.stories,
        createdAt: kidDetails.createdAt,
        lastUpdated: kidDetails.lastUpdated,
        name: kidDetails.name,
        avatarUrl: uploadedImageUrl
      };
      
      const response = await KidApi.createOrUpdateKid({
        userId: currentUser.uid,
        kid: kidDetailsToSave
      });

      if (!response.success) {
        throw new Error(response.error || t.createKid.error.saveFailed);
      }

      // Update the local kid details with the ID for redirection
      const updatedKidDetails = {
        ...kidDetailsToSave,
        id: response.data?.kidId || ''
      };
      
      // Update our local state
      useCreateKidState.setState({ 
        kidDetails: updatedKidDetails,
        currentImageUrl: uploadedImageUrl,
        isComplete: true
      });
      
      setIsComplete(true);
      
      // Show success notification
      toast({
        title: t.createKid.success.created,
        description: t.createKid.success.saved,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error saving kid:", error);
      setError(error instanceof Error ? error.message : t.createKid.error.saveFailed);
      toast({
        title: "Error",
        description: t.createKid.error.saveFailed,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {t.createKid.title}
        </h1>
        
        <div className="mb-8">
          {/* Step 1: Kid Details */}
          <StepAccordionItem
            title={t.createStory.kidDetails.title}
            isActive={activeStep === 0}
            isCompleted={isKidDetailsDone}
            isDisabled={false}
            isExpanded={expandedSteps.includes(0)}
            onToggle={() => handleStepToggle(0)}
          >
            <KidDetailsContent />
          </StepAccordionItem>

          {/* Step 2: Image Upload */}
          <StepAccordionItem
            title={t.createStory.imageUpload.title}
            isActive={activeStep === 1}
            isCompleted={isImageValidationDone}
            isDisabled={!isKidDetailsDone}
            isExpanded={expandedSteps.includes(1)}
            onToggle={() => isKidDetailsDone ? handleStepToggle(1) : null}
          >
            <ImageUploadContent />
          </StepAccordionItem>

          {/* Avatar generation step removed */}

          {/* Final step: Save and Create */}
          <div className="mt-8">
            {error && (
              <div className="p-4 mb-4 text-sm text-red-800 bg-red-50 rounded-lg">
                {error}
              </div>
            )}
            
            <Button
              className="w-full"
              onClick={handleSaveKid}
              disabled={!isKidDetailsDone || !isImageValidationDone || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.createKid.success.saving}
                </>
              ) : (
                t.createKid.title
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 