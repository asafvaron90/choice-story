"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useLanguage } from "@/app/context/LanguageContext";
import { translations } from "@/app/translations";
import useCreateKidState from "../state/create-kid-state";
import Image from 'next/image';
import { Check, X, Upload } from "lucide-react";
import { AvatarApi } from '@/app/network/AvatarApi';
import { DeviceImageUpload } from "@/app/components/forms/DeviceImageUpload";

// Define interface for example items
interface ExampleItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  isCorrect?: boolean;
  bgColor: string;
  validatedBgColor?: string;
}

// Image validation examples - moved from create-a-story to be self-contained
const imageExamples: ExampleItem[] = [
  {
    icon: (
      <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#F3F4F6" />
        <rect x="40" y="20" width="120" height="160" rx="10" fill="#E5E7EB" stroke="#4F46E5" strokeWidth="2" />
        <circle cx="100" cy="70" r="30" fill="#4F46E5" />
        <circle cx="85" cy="60" r="3" fill="white" />
        <circle cx="115" cy="60" r="3" fill="white" />
        <path d="M90 80 Q100 90 110 80" stroke="white" strokeWidth="2" />
        <rect x="70" y="100" width="60" height="70" rx="5" fill="#4F46E5" />
      </svg>
    ),
    label: "צילום ישר וברור",
    description: "הפנים במרכז התמונה",
    isCorrect: true,
    bgColor: "bg-green-100",
    validatedBgColor: "bg-green-100"
  },
  {
    icon: (
      <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#F3F4F6" />
        <rect x="40" y="20" width="120" height="160" rx="10" fill="#E5E7EB" stroke="#EF4444" strokeWidth="2" transform="rotate(-15 100 100)" />
        <circle cx="100" cy="70" r="30" fill="#EF4444" transform="rotate(-15 100 70)" />
        <path d="M90 80 Q100 90 110 80" stroke="white" strokeWidth="2" transform="rotate(-15 100 70)" />
        <rect x="70" y="100" width="60" height="70" rx="5" fill="#EF4444" transform="rotate(-15 100 100)" />
      </svg>
    ),
    label: "ראש טיפה מעלה",
    description: "הראש מוטה - לא טוב",
    isCorrect: false,
    bgColor: "bg-red-100",
    validatedBgColor: "bg-red-100"
  },
  {
    icon: (
      <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#F3F4F6" />
        <rect x="30" y="20" width="140" height="160" rx="10" fill="#E5E7EB" stroke="#EF4444" strokeWidth="2" />
        <circle cx="80" cy="70" r="25" fill="#EF4444" />
        <circle cx="140" cy="70" r="25" fill="#EF4444" />
      </svg>
    ),
    label: "כמה פרצופים",
    description: "יותר מפנים אחד בתמונה",
    isCorrect: false,
    bgColor: "bg-red-100",
    validatedBgColor: "bg-red-100"
  },
  {
    icon: (
      <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#F3F4F6" />
        <rect x="40" y="20" width="120" height="160" rx="10" fill="#E5E7EB" stroke="#EF4444" strokeWidth="2" />
        <circle cx="100" cy="70" r="30" fill="#EF4444" />
        <rect x="70" y="55" width="60" height="30" fill="#E5E7EB" stroke="#EF4444" strokeWidth="2" />
        <rect x="70" y="100" width="60" height="70" rx="5" fill="#EF4444" />
      </svg>
    ),
    label: "פנים מכוסות",
    description: "פנים מוסתרות או מכוסות",
    isCorrect: false,
    bgColor: "bg-red-100",
    validatedBgColor: "bg-red-100"
  }
];

export default function ImageUploadContent() {
  const { kidDetails, setKidDetails: _setKidDetails, currentImageUrl, setCurrentImageUrl, currentImageBase64, setCurrentImageBase64, imageRequirements, setImageRequirements, setSelectedImageFile } = useCreateKidState((state) => state);
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const t = translations[language].createStory.imageUpload;

  const [isImageUpdated, setImageUpdated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [_isLoading, _setIsLoading] = useState(false);
  const [_loadingMessage, _setLoadingMessage] = useState("");
  const [_loadingProgress, _setLoadingProgress] = useState(0);

  useEffect(() => {
    // Validation error checking
    if (imageRequirements && !imageRequirements.isValid) {
      const errors: Record<string, boolean> = {};
      if (imageRequirements.validations) {
        Object.entries(imageRequirements.validations).forEach(([key, validation]) => {
          if (!validation.isValid) {
            errors[key] = true;
          }
        });
      }
      setValidationErrors(errors);
    }
  }, [imageRequirements]);

  async function onImageSelected(file: File, previewUrl: string, base64: string) {
    try {
      setIsVerifying(true);
      setError(null);
      
      console.log("Starting image verification process");
      
      // Store the file reference in state
      setSelectedImageFile(file);
      
      // Store the temporary preview URL
      setCurrentImageUrl(previewUrl);
      setCurrentImageBase64(base64);
      
      // Reset all related states for the new image
      setImageRequirements(null);
      setImageUpdated(false);
      setShowPlaceholder(false);
      setValidationErrors({});

      // Upload image to Firebase Storage first
      try {
        console.log("Uploading image to Firebase Storage...");
        
        const uploadResponse = await fetch('/api/upload_image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base64Data: base64,
            userId: currentUser?.uid,
            folderPath: kidDetails?.name ? `kids/${kidDetails.name}` : 'kids',
            fileName: `${kidDetails?.name || 'kid'}_${Date.now()}.png`,
            fileType: 'png'
          }),
        });

        const uploadData = await uploadResponse.json();
        
        if (!uploadData.success || !uploadData.url) {
          console.error("Image upload failed:", uploadData.error);
          throw new Error(uploadData.error || 'Failed to upload image to storage');
        }

        const firebaseImageUrl = uploadData.url;
        console.log("Image uploaded successfully:", firebaseImageUrl);

        // Now check image requirements using the Firebase Storage URL
        console.log("Sending image URL for requirements check");
        
        const response = await AvatarApi.checkRequirements({
          imageUrl: firebaseImageUrl,
          expectedGender: kidDetails?.gender as 'male' | 'female',
          expectedAge: kidDetails?.age,
          name: kidDetails?.name,
        });

        if (!response.success || !response.data) {
          console.error("Requirements check failed");
          throw new Error('Failed to check image requirements');
        }

        // The API already returns ImageRequirementsCheckResponse, so use it directly
        setImageRequirements(response.data);
        
        // Keep the original preview URL - don't switch to Firebase URL
        // The image is already uploaded to Firebase and we have the URL for saving later
      } catch (requirementsError) {
        console.error("Error checking requirements:", requirementsError);
        setError(t.validation.analysisError);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsVerifying(false);
    }
  }

  const handleError = (error: unknown) => {
    console.error("Error processing image:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    setError(errorMessage);
    setImageUpdated(false);
    setShowPlaceholder(true);
  };

  // Display validation feedback for the image
  const ValidationFeedback = () => {
    if (!imageRequirements) return null;
    
    // Create a summary message from the validations
    const getValidationSummary = () => {
      if (!imageRequirements.validations) return '';
      
      const issues = [];
      
      if (!imageRequirements.validations.facePosition.isValid) {
        issues.push(imageRequirements.validations.facePosition.details);
      }
      
      if (!imageRequirements.validations.faceVisibility.isValid) {
        issues.push(imageRequirements.validations.faceVisibility.details);
      }
      
      if (!imageRequirements.validations.singleSubject.isValid) {
        issues.push(imageRequirements.validations.singleSubject.details);
      }
      
      if (!imageRequirements.validations.imageQuality.isValid) {
        issues.push(imageRequirements.validations.imageQuality.details);
      }
      
      return issues.length > 0 
        ? issues.join(' ') 
        : imageRequirements.recommendations && imageRequirements.recommendations.length > 0 
          ? imageRequirements.recommendations[0] 
          : '';
    };
    
    if (!currentImageUrl) return null;
    
    return (
      <div className={`mt-4 p-4 rounded-md ${imageRequirements.isValid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-start">
          <div className={`mr-2 mt-0.5 ${imageRequirements.isValid ? 'text-green-500' : 'text-yellow-500'}`}>
            {imageRequirements.isValid ? 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
              </svg> : 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
              </svg>
            }
          </div>
          <div>
            <p className="text-sm font-medium">
              {imageRequirements.isValid ? 
                t.validation.matchesRequirement : 
                t.validation.needsAdjustment
              }
            </p>
            <p className="text-xs mt-1 text-gray-600">
              {getValidationSummary()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Map validation errors to example types
  const getExampleStatus = (example: ExampleItem): { highlight: boolean, error: boolean, isValid: boolean } => {
    // If no validation results yet, don't highlight anything
    if (!imageRequirements?.validations) {
      return { highlight: false, error: false, isValid: false };
    }
    
    // Handle the correct example card
    if (example.label === "צילום ישר וברור") {
      const isValid = imageRequirements.validations.facePosition?.isValid !== false;
      return { highlight: true, error: !isValid, isValid };
    }
    
    // Handle the face tilt example card
    if (example.label === "ראש טיפה מעלה") {
      const isValid = imageRequirements.validations.facePosition?.isValid !== false;
      return { highlight: true, error: !isValid, isValid };
    }
    
    // Handle the multiple faces example card
    if (example.label === "כמה פרצופים") {
      const isValid = imageRequirements.validations.singleSubject?.isValid !== false;
      return { highlight: true, error: !isValid, isValid };
    }
    
    // Handle the covered faces example card
    if (example.label === "פנים מכוסות") {
      const isValid = imageRequirements.validations.faceVisibility?.isValid !== false;
      return { highlight: true, error: !isValid, isValid };
    }
    
    return { highlight: false, error: false, isValid: false };
  };

  // Display image validation illustrations
  const ImageValidationExamples = () => {
    return (
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2 text-center">
          {imageRequirements?.isValid ? t.validation.matchesRequirement : (imageRequirements ? t.validation.needsAdjustment : t.validation.matchesRequirement)}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {imageExamples.map((example: ExampleItem, index: number) => {
            const status = getExampleStatus(example);
            
            // Determine background color based on validation status
            let bgColorClass = example.bgColor;
            
            if (imageRequirements?.validations) {
              // If this specific validation passed, show green
              if (status.isValid) {
                bgColorClass = "bg-green-100";
              } else {
                // If this specific validation failed, show red
                bgColorClass = "bg-red-100";
              }
            }
            
            return (
              <div 
                key={index} 
                className={`p-3 rounded-lg 
                  ${bgColorClass} 
                  flex flex-col items-center
                  ${status.highlight ? 'ring-2 ring-offset-2 ' + (status.error ? 'ring-red-500' : 'ring-green-500') : ''}
                  ${Object.keys(validationErrors).length > 0 ? 'transition-all duration-300' : ''}
                `}
              >
                <div className="w-16 h-16 mb-2">
                  {example.icon}
                </div>
                <p className={`text-sm font-medium text-center ${status.highlight ? (status.error ? 'text-red-700' : 'text-green-700') : ''}`}>
                  {example.label}
                </p>
                <p className="text-xs text-center text-gray-600">{example.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Face scanning animation component
  const FaceScanAnimation = () => {
    return (
      <div className="w-full h-full absolute inset-0 overflow-hidden rounded-lg">
        {/* Semi-transparent overlay to improve visibility of scanning effects */}
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        
        {/* Horizontal scanning line */}
        <div 
          className="absolute left-0 right-0 h-1 bg-blue-400 z-10 animate-scan-vertical" 
          style={{ boxShadow: '0 0 10px 3px rgba(59, 130, 246, 0.7)' }}
        />
        
        {/* Vertical scanning line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-blue-400 z-10 animate-scan-horizontal" 
          style={{ boxShadow: '0 0 10px 3px rgba(59, 130, 246, 0.7)' }}
        />
        
        {/* Face detection grid overlay */}
        <div className="absolute inset-0">
          <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="90" height="90" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-70" />
            <circle cx="50" cy="30" r="15" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-70" />
            <rect x="35" y="15" width="30" height="30" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-70" />
            {/* Face landmarks points */}
            <circle cx="42" cy="25" r="1" fill="#3B82F6" className="opacity-80" />
            <circle cx="58" cy="25" r="1" fill="#3B82F6" className="opacity-80" />
            <circle cx="50" cy="35" r="1" fill="#3B82F6" className="opacity-80" />
            <path d="M40,30 Q50,40 60,30" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="1 1" className="opacity-70" />
          </svg>
        </div>
        
        {/* Status info */}
        <div className="absolute bottom-5 left-0 right-0 text-center z-20">
          <p className="text-lg font-bold text-blue-400 drop-shadow-md">
            Verifying image...
          </p>
          <p className="text-sm text-white drop-shadow-md">
            Checking image requirements
          </p>
        </div>
      </div>
    );
  };

  // Image container with all possible states
  const ImageContainer = () => {
    // If we have an image, show it
    if (currentImageUrl && !showPlaceholder) {
      return (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">{t.title}</h3>
          
          <div className="mb-6 flex flex-col items-center">
            <div className="relative w-full max-w-xs">
              <Image 
                src={currentImageUrl} 
                alt="Kid's avatar" 
                width={300} 
                height={300} 
                className="rounded-lg shadow-md w-full object-cover aspect-square"
              />
              
              {/* Show scanning animation if validating */}
              {isVerifying && <FaceScanAnimation />}
              
              {/* Show validation state */}
              {imageRequirements && !isVerifying && (
                <div className={`absolute top-2 right-2 p-2 rounded-full ${imageRequirements.isValid ? 'bg-green-500' : 'bg-red-500'}`}>
                  {imageRequirements.isValid ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <X className="h-5 w-5 text-white" />
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-4 w-full max-w-xs">
              <DeviceImageUpload
                onImageSelected={onImageSelected}
                buttonText={t.uploadButton}
                buttonClassName="w-full bg-blue-600 hover:bg-blue-700 text-white"
                showPreview={false} // We already have a preview above
                disabled={isVerifying} // Disable when processing
              />
            </div>
          </div>
        </div>
      );
    }
    
    // Otherwise, show upload UI
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">{t.title}</h3>
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-blue-50 rounded-full mb-4">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <h4 className="text-lg font-medium mb-2">{t.instructions.title}</h4>
          <p className="text-gray-500 mb-6 max-w-md">{t.instructions.description}</p>
          
          <DeviceImageUpload
            onImageSelected={onImageSelected}
            buttonText={t.uploadButton}
            buttonClassName="bg-blue-600 hover:bg-blue-700 text-white"
            showPreview={true}
            previewSize={200}
          />
        </div>
      </div>
    );
  };

  // Status message below the image
  const StatusMessage = () => {
    if (!currentImageUrl) return null;
    
    if (isVerifying) {
      return (
        <div className="text-center text-sm text-blue-600 font-medium mt-2">
          Verifying image requirements...
        </div>
      );
    }
    
    
    if (imageRequirements?.isValid === false) {
      return (
        <div className="text-center text-sm text-red-600 font-medium mt-2">
          Image doesn't meet requirements: {imageRequirements?.issues?.join(', ') || 'Unknown issue'}
        </div>
      );
    }
    
    if (imageRequirements?.isValid === true) {
      return (
        <>
        </>
      );
    }
    
    return (
      <div className="text-center text-sm text-blue-600 font-medium mt-2">
        Image loaded, waiting for verification...
        {imageRequirements === null ? ' (No requirements data yet)' : ' (Requirements loaded)'}
      </div>
    );
  };

  return (
    <div>
      {/* 1. Image validation illustrations */}
      <ImageValidationExamples />
      
      {/* 2. Image container with all states */}
      <ImageContainer />
      
      {/* 3. Status message */}
      <StatusMessage />
      
      {/* 4. Validation feedback */}
      <ValidationFeedback />
      
      {/* 5. Error messages */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
} 