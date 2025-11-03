"use client";

import { KidDetails } from '@/models';
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/app/hooks/useTranslation";
import useCreateKidState from "../state/create-kid-state";
import GenderSelector from "@/app/create-a-kid/components/GenderSelector";

// Helper function to get the display gender value from API value
const getDisplayGenderValue = (apiGender: string | undefined, language: string): string => {
  if (!apiGender) return "";
  
  // Map API gender values to display values
  if (apiGender === "male") {
    return language === "he" ? "זכר" : "Boy";
  } else if (apiGender === "female") {
    return language === "he" ? "נקבה" : "Girl";
  }
  
  return apiGender; // Fallback to original value
};

export default function KidDetailsContent() {
  const { t, language } = useTranslation();
  const { kidDetails, setKidDetails } = useCreateKidState();

  const handleInputChange = (field: keyof KidDetails, value: string) => {
    if (!kidDetails) return;
    setKidDetails({ ...kidDetails, [field]: value });
  };

  if (!kidDetails) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t.createStory.kidDetails.title}</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t.createStory.kidDetails.nameLabel}
          </label>
          <Input
            type="text"
            value={kidDetails.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder={t.createStory.kidDetails.nameLabel}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t.createStory.kidDetails.ageLabel}
          </label>
          <Input
            type="number"
            value={kidDetails.age || ""}
            onChange={(e) => handleInputChange("age", e.target.value)}
            placeholder={t.createStory.kidDetails.ageLabel}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t.createStory.kidDetails.genderLabel}
          </label>
          <GenderSelector
            values={[t.createStory.kidDetails.male, t.createStory.kidDetails.female]}
            onChange={(value) => handleInputChange("gender", value)}
            initialValue={getDisplayGenderValue(kidDetails.gender, language)}
          />
        </div>
      </div>
    </div>
  );
} 