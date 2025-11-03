"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import Image from "next/image";

export interface DeviceImageUploadProps {
  onImageSelected: (file: File, previewUrl: string, base64: string) => Promise<void>;
  buttonText?: string;
  buttonClassName?: string;
  showIcon?: boolean;
  showPreview?: boolean;
  previewSize?: number;
  disabled?: boolean;
}

export const DeviceImageUpload = ({
  onImageSelected,
  buttonText = "Upload Image",
  buttonClassName = "bg-blue-500 hover:bg-blue-600 text-white",
  showIcon = true,
  showPreview = false,
  previewSize = 100,
  disabled = false,
}: DeviceImageUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsProcessing(true);
      
      // Create a preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Convert to base64
      const base64 = await readFileAsBase64(file);
      
      // Notify parent with the file, preview URL, and base64 data
      await onImageSelected(file, objectUrl, base64);
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  return (
    <div className="flex flex-col items-center gap-4">
      {showPreview && previewUrl && (
        <div className="relative" style={{ width: previewSize, height: previewSize }}>
          <Image 
            src={previewUrl} 
            alt="Preview" 
            width={previewSize} 
            height={previewSize} 
            className="object-cover rounded-md" 
          />
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-md">
              <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      )}
      
      <Button 
        className={buttonClassName} 
        onClick={() => document.getElementById('file-upload')?.click()}
        disabled={isProcessing || disabled}
      >
        {showIcon && <Upload className="w-4 h-4 mr-2" />}
        {isProcessing ? 'Processing...' : buttonText}
        <input 
          id="file-upload" 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange}
          disabled={isProcessing || disabled}
        />
      </Button>
    </div>
  );
};