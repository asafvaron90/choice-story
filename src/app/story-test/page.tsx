'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useTranslation } from '@/app/hooks/useTranslation';
import { KidDetails, Story, PageType } from '@/models';
import { KidApi, StoryApi, TextGenerationApi, ImageGenerationApi } from '@/app/network';
import { StoryTemplates } from '@/app/_lib/services/prompt_templats';
import { functionClientAPI } from '@/app/network/functions';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Copy, Image as ImageIcon } from 'lucide-react';
import ImageUrl from '@/app/components/common/ImageUrl';
import { PLACEHOLDER_IMAGE } from '@/app/utils/imagePlaceholder';
import * as Sentry from "@sentry/nextjs";

export default function StoryTestPage() {
  const { currentUser } = useAuth();
  const { t: _t } = useTranslation();
  
  // State for kids and stories
  const [kids, setKids] = useState<KidDetails[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string>('');
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [_isLoadingKids, setIsLoadingKids] = useState(false);
  const [_isLoadingStories, setIsLoadingStories] = useState(false);
  
  // State for selected story data
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedKid, setSelectedKid] = useState<KidDetails | null>(null);
  
  // State for avatar generation
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [generatedAvatars, setGeneratedAvatars] = useState<string[]>([]);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  
  // State for story regeneration
  const [isRegeneratingStory, setIsRegeneratingStory] = useState(false);
  
  // State for image generation testing
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedTestImage, setGeneratedTestImage] = useState<string | null>(null);
  
  // State for title generation testing
  const [customProblemDescription, setCustomProblemDescription] = useState('');
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);

  const loadKids = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoadingKids(true);
    try {
      const response = await KidApi.getKids(currentUser.uid);
      if (response.success && response.data) {
        setKids(response.data.kids || []);
      }
    } catch (error) {
      console.error('Error loading kids:', error);
      Sentry.captureException(error);
      toast({
        title: "Error",
        description: "Failed to load kids",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKids(false);
    }
  }, [currentUser]);

  const loadStories = useCallback(async (kidId: string) => {
    if (!currentUser) return;
    
    setIsLoadingStories(true);
    try {
      const response = await StoryApi.getStoriesByKid(currentUser.uid, kidId);
      if (response.success && response.data) {
        setStories(response.data.stories || []);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      Sentry.captureException(error);
      toast({
        title: "Error",
        description: "Failed to load stories",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStories(false);
    }
  }, [currentUser]);

  // Load kids on component mount
  useEffect(() => {
    if (currentUser) {
      loadKids();
    }
  }, [currentUser, loadKids]);

  // Load stories when kid is selected
  useEffect(() => {
    if (selectedKidId && currentUser) {
      loadStories(selectedKidId);
    }
  }, [selectedKidId, currentUser, loadStories]);

  // Update selected story when story ID changes
  useEffect(() => {
    if (selectedStoryId && stories.length > 0) {
      const story = stories.find(s => s.id === selectedStoryId);
      setSelectedStory(story || null);
    }
  }, [selectedStoryId, stories]);

  // Update selected kid when kid ID changes
  useEffect(() => {
    if (selectedKidId && kids.length > 0) {
      const kid = kids.find(k => k.id === selectedKidId);
      setSelectedKid(kid || null);
      setSelectedAvatarUrl(kid?.kidSelectedAvatar || null);
    }
  }, [selectedKidId, kids]);



  const handleGenerateAvatar = async () => {
    if (!currentUser || !selectedKid || !selectedKid.imageAnalysis) {
      toast({
        title: "Error",
        description: "No image analysis available for avatar generation",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAvatar(true);
    try {
      const result = await ImageGenerationApi.generateAvatarImage(
        currentUser.uid,
        selectedKid,
        selectedKid.imageAnalysis
      );

      if (result.success && result.data) {
        setGeneratedAvatars(result.data);
        toast({
          title: "Success",
          description: "Avatar images generated successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to generate avatar images');
      }
    } catch (error) {
      console.error('Avatar generation error:', error);
      Sentry.captureException(error);
      toast({
        title: "Error",
        description: "Failed to generate avatar images",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleSelectAvatar = async (avatarUrl: string) => {
    if (!currentUser || !selectedKid) return;

    try {
      const kidData: KidDetails = {
        ...selectedKid,
        kidSelectedAvatar: avatarUrl
      };

      const updateResponse = await KidApi.createOrUpdateKid({
        userId: currentUser.uid,
        kid: kidData
      });

      if (updateResponse.success) {
        setSelectedAvatarUrl(avatarUrl);
        setSelectedKid(kidData);
        toast({
          title: "Success",
          description: "Avatar selected successfully",
        });
      } else {
        throw new Error(updateResponse.error || 'Failed to update kid data');
      }
    } catch (error) {
      console.error('Error selecting avatar:', error);
      Sentry.captureException(error);
      toast({
        title: "Error",
        description: "Failed to select avatar",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateStory = async () => {
    if (!currentUser || !selectedKid || !selectedStory) return;

    setIsRegeneratingStory(true);
    try {
      const prompt = await StoryTemplates.fullStoryTextGeneration(
        selectedStory.title,
        selectedStory.problemDescription,
        selectedKid.age,
        selectedKid.name || 'NO NAME'
      );

      const response = await TextGenerationApi.generateText({
        prompt,
        language: 'en',
        userId: currentUser.uid
      });

      if (!response.success || !response.data?.text) {
        throw new Error('error' in response ? response.error : 'Failed to generate story');
      }

      const storyPages = StoryTemplates.fullStoryTextGenerationResponseConvertor(response.data.text);
      if (!storyPages) {
        throw new Error('Failed to parse generated story');
      }

      // Update the story with new pages
      const updatedStory: Story = {
        ...selectedStory,
        pages: storyPages,
        lastUpdated: new Date()
      };

      setSelectedStory(updatedStory);
      toast({
        title: "Success",
        description: "Story regenerated successfully",
      });
    } catch (error) {
      console.error('Error regenerating story:', error);
      Sentry.captureException(error);
      toast({
        title: "Error",
        description: "Failed to regenerate story",
        variant: "destructive",
      });
    } finally {
      setIsRegeneratingStory(false);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleGenerateTitles = async () => {
    if (!currentUser || !selectedKid || !customProblemDescription.trim()) {
      toast({
        title: "Error",
        description: "Please enter a problem description",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingTitles(true);
    try {
      const response = await functionClientAPI.generateStoryTitles({
        name: selectedKid.name || 'Child',
        gender: selectedKid.gender as 'male' | 'female',
        problemDescription: customProblemDescription,
        age: selectedKid.age,
        advantages: undefined,
        disadvantages: undefined
      });

      if (!response.success || !response.titles || response.titles.length === 0) {
        throw new Error('Failed to generate titles');
      }

      setGeneratedTitles(response.titles);
      toast({
        title: "Success",
        description: "Titles generated successfully",
      });
    } catch (error) {
      console.error('Error generating titles:', error);
      Sentry.captureException(error);
      toast({
        title: "Error",
        description: "Failed to generate titles",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const handleGenerateTestImage = async () => {
    if (!currentUser || !selectedKid || !customImagePrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter an image prompt",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const result = await ImageGenerationApi.generateImage({
        userId: currentUser.uid,
        kidDetails: selectedKid,
        prompt: customImagePrompt,
        outputCount: 1
      });

      if (result.success && result.data && result.data.length > 0) {
        setGeneratedTestImage(result.data[0]);
        toast({
          title: "Success",
          description: "Test image generated successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to generate test image');
      }
    } catch (error) {
      console.error('Error generating test image:', error);
      Sentry.captureException(error);
      toast({
        title: "Error",
        description: "Failed to generate test image",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const getPageTypeLabel = (pageType: PageType) => {
    switch (pageType) {
      case PageType.COVER: return 'Cover';
      case PageType.NORMAL: return 'Normal';
      case PageType.GOOD_CHOICE: return 'Good Choice';
      case PageType.BAD_CHOICE: return 'Bad Choice';
      case PageType.GOOD: return 'Good Flow';
      case PageType.BAD: return 'Bad Flow';
      default: return pageType;
    }
  };

  const getPageTypeColor = (pageType: PageType) => {
    switch (pageType) {
      case PageType.COVER: return 'bg-blue-100 text-blue-800';
      case PageType.NORMAL: return 'bg-gray-100 text-gray-800';
      case PageType.GOOD_CHOICE: return 'bg-green-100 text-green-800';
      case PageType.BAD_CHOICE: return 'bg-red-100 text-red-800';
      case PageType.GOOD: return 'bg-emerald-100 text-emerald-800';
      case PageType.BAD: return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Story Test Dashboard</h1>
      </div>

      {/* Story Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Story Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kid-select">Select Kid</Label>
              <Select value={selectedKidId} onValueChange={setSelectedKidId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a kid" />
                </SelectTrigger>
                <SelectContent>
                  {kids.map((kid) => (
                    <SelectItem key={kid.id} value={kid.id}>
                      {kid.name || 'Unnamed Kid'} ({kid.age} years old)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="story-select">Select Story</Label>
              <Select value={selectedStoryId} onValueChange={setSelectedStoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a story" />
                </SelectTrigger>
                <SelectContent>
                  {stories.map((story) => (
                    <SelectItem key={story.id} value={story.id}>
                      {story.problemDescription}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedKid && selectedStory && (
        <>
          {/* Kid Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Kid Avatar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6">
                {/* Original Image */}
                <div className="text-center">
                  <h4 className="text-sm font-semibold mb-2">Original Image</h4>
                  <div className="w-32 h-32 relative rounded-full overflow-hidden border-2 border-gray-300">
                    <ImageUrl
                      src={selectedKid.avatarUrl || PLACEHOLDER_IMAGE}
                      alt={`${selectedKid.name || 'Kid'}'s original image`}
                      fill
                      priority
                      sizes="128px"
                      style={{ objectFit: "cover" }}
                      className="rounded-full"
                    />
                  </div>
                </div>

                {/* Generate Avatar Button */}
                <div className="text-center">
                  <Button
                    onClick={handleGenerateAvatar}
                    disabled={isGeneratingAvatar || !selectedKid.imageAnalysis}
                    className="mb-2"
                  >
                    {isGeneratingAvatar ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Generate Avatar
                      </>
                    )}
                  </Button>
                  {!selectedKid.imageAnalysis && (
                    <p className="text-xs text-gray-500">No image analysis available</p>
                  )}
                </div>

                {/* Generated Avatars */}
                {generatedAvatars.length > 0 && (
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-2">Generated Avatars</h4>
                    <div className="flex space-x-2">
                      {generatedAvatars.map((avatarUrl, index) => (
                        <div key={index} className="text-center">
                          <div className={`w-24 h-24 relative rounded-full overflow-hidden border-2 ${
                            selectedAvatarUrl === avatarUrl ? 'border-blue-500' : 'border-gray-200'
                          }`}>
                            <ImageUrl
                              src={avatarUrl}
                              alt={`Generated avatar ${index + 1}`}
                              fill
                              priority
                              sizes="96px"
                              style={{ objectFit: "cover" }}
                              className="rounded-full cursor-pointer"
                              onClick={() => handleSelectAvatar(avatarUrl)}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant={selectedAvatarUrl === avatarUrl ? "default" : "outline"}
                            onClick={() => handleSelectAvatar(avatarUrl)}
                            className="mt-1 text-xs"
                          >
                            {selectedAvatarUrl === avatarUrl ? 'Selected' : 'Select'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Problem Description */}
          <Card>
            <CardHeader>
              <CardTitle>Problem Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Title</h4>
                  <p className="text-gray-700">{selectedStory.title}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Problem</h4>
                  <p className="text-gray-700">{selectedStory.problemDescription}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Advantages</h4>
                    <p className="text-gray-700">Story addresses age-appropriate challenges and provides learning opportunities</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Disadvantages</h4>
                    <p className="text-gray-700">May need customization for specific learning objectives</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Title Generation Testing */}
          <Card>
            <CardHeader>
              <CardTitle>Title Generation Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="problem-description">Custom Problem Description</Label>
                  <Textarea
                    id="problem-description"
                    value={customProblemDescription}
                    onChange={(e) => setCustomProblemDescription(e.target.value)}
                    placeholder="Enter a problem description to generate titles..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleGenerateTitles}
                  disabled={isGeneratingTitles || !customProblemDescription.trim()}
                >
                  {isGeneratingTitles ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Generating Titles...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Titles
                    </>
                  )}
                </Button>
                
                {generatedTitles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Generated Titles</h4>
                    <div className="space-y-2">
                      {generatedTitles.map((title, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded border">
                          <p className="text-sm font-medium">{title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Story Texts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Story Texts</CardTitle>
                <Button
                  onClick={handleRegenerateStory}
                  disabled={isRegeneratingStory}
                  variant="outline"
                >
                  {isRegeneratingStory ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Full Story
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedStory.pages.map((page, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getPageTypeColor(page.pageType)}>
                          {getPageTypeLabel(page.pageType)}
                        </Badge>
                        <span className="text-sm text-gray-500">Page {page.pageNum}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{page.storyText}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Image Prompts Section */}
          <Card>
            <CardHeader>
              <CardTitle>Image Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedStory.pages.map((page, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getPageTypeColor(page.pageType)}>
                          {getPageTypeLabel(page.pageType)}
                        </Badge>
                        <span className="text-sm text-gray-500">Page {page.pageNum}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(page.imagePrompt)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Prompt
                      </Button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      {page.imagePrompt}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Image Generation Testing */}
          <Card>
            <CardHeader>
              <CardTitle>Image Generation Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="image-prompt">Custom Image Prompt</Label>
                  <Textarea
                    id="image-prompt"
                    value={customImagePrompt}
                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                    placeholder="Enter your custom image prompt here..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleGenerateTestImage}
                  disabled={isGeneratingImage || !customImagePrompt.trim()}
                >
                  {isGeneratingImage ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Generating Image...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Generate Test Image
                    </>
                  )}
                </Button>
                
                {generatedTestImage && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Generated Test Image</h4>
                    <div className="w-64 h-64 relative rounded-lg overflow-hidden border-2 border-gray-300">
                      <ImageUrl
                        src={generatedTestImage}
                        alt="Generated test image"
                        fill
                        priority
                        sizes="256px"
                        style={{ objectFit: "cover" }}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
