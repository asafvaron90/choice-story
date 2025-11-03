import { KidDetails } from '@/models';
import { ImageRequirementsCheckResponse } from "@/app/_lib/services/replicate_api";
import { create } from "zustand";

interface CreateKidState {
  // Kid details
  kidDetails: KidDetails | null;
  setKidDetails: (kidDetails: KidDetails) => void;
  
  // Image upload
  currentImageUrl: string | null;
  setCurrentImageUrl: (url: string) => void;
  currentImageBase64: string | null;
  setCurrentImageBase64: (base64: string) => void;
  selectedImageFile: File | null;
  setSelectedImageFile: (file: File) => void;
  
  // Image validation
  imageRequirements: ImageRequirementsCheckResponse | null;
  setImageRequirements: (requirements: ImageRequirementsCheckResponse | null) => void;
  
  // Status flags
  step: number; // 0 = kid details, 1 = image upload
  next: () => void;
  back: () => void;
  isComplete: boolean;
  setIsComplete: (isComplete: boolean) => void;
  
  // Clear state
  reset: () => void;
}

const useCreateKidState = create<CreateKidState>()((set) => ({
  // Kid details
  kidDetails: null,
  setKidDetails: (kidDetails: KidDetails) => {
    console.log("Setting kid details...", kidDetails);
    set({ kidDetails });
  },
  
  // Image upload
  currentImageUrl: null,
  setCurrentImageUrl: (url: string) => {
    console.log("Setting current image URL...", url);
    set({ currentImageUrl: url });
  },
  currentImageBase64: null,
  setCurrentImageBase64: (base64: string) => {
    console.log("Setting current image base64...", base64);
    set({ currentImageBase64: base64 });
  },
  selectedImageFile: null,
  setSelectedImageFile: (file: File) => {
    console.log("Setting selected image file...");
    set({ selectedImageFile: file });
  },
  
  // Image validation
  imageRequirements: null,
  setImageRequirements: (requirements: ImageRequirementsCheckResponse | null) => {
    console.log("Setting image requirements...", requirements);
    set({ imageRequirements: requirements });
  },
  
  
  // Status flags
  step: 0,
  next: () => set((state) => ({ step: state.step + 1 })),
  back: () => set((state) => ({ step: Math.max(0, state.step - 1) })),
  isComplete: false,
  setIsComplete: (isComplete: boolean) => set({ isComplete }),
  
  // Clear state
  reset: () => set({
    kidDetails: null,
    currentImageUrl: null,
    currentImageBase64: null,
    selectedImageFile: null,
    imageRequirements: null,
    step: 0,
    isComplete: false
  }),
}));

export default useCreateKidState; 