"use client";

import { useState, useEffect } from "react";
// API calls will be made to server-side routes
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Image, BookOpen, User } from "lucide-react";
import useUserData from "@/app/hooks/useUserData";
import { KidDetails } from "@/models";

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export default function AIBotsTestPage() {
  const [storyImagePrompt, setStoryImagePrompt] = useState("");
  const [storyPrompt, setStoryPrompt] = useState("");
  const [selectedKidId, setSelectedKidId] = useState<string>("none");
  const [avatarAnalysis, setAvatarAnalysis] = useState<string | null>(null);
  const [analyzingAvatar, setAnalyzingAvatar] = useState(false);
  const [avatarResult, setAvatarResult] = useState<TestResult | null>(null);
  const [storyImageResult, setStoryImageResult] = useState<TestResult | null>(null);
  const [storyResult, setStoryResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState({
    avatar: false,
    storyImage: false,
    story: false,
  });

  // User and kids data
  const { kids, isLoading: kidsLoading, refreshKids, userData } = useUserData();

  const selectedKid = selectedKidId === "none" ? null : kids.find(kid => kid.id === selectedKidId);


  // Analyze generated avatar
  const analyzeGeneratedAvatar = async (avatarBase64: string) => {
    setAnalyzingAvatar(true);
    setAvatarAnalysis(null);
    
    try {
      // Convert base64 to data URL
      const avatarDataUrl = `data:image/jpeg;base64,${avatarBase64}`;
      
      const response = await fetch('/api/ai-bots/analyze-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: avatarDataUrl })
      });
      
      if (response.ok) {
        // Get raw JSON string without parsing
        const rawJsonString = await response.text();
        setAvatarAnalysis(rawJsonString);
      } else {
        const errorData = await response.json();
        setAvatarAnalysis(`Error: ${errorData.error || 'Failed to analyze avatar'}`);
      }
    } catch (error) {
      setAvatarAnalysis(`Error: ${error instanceof Error ? error.message : 'Failed to analyze avatar'}`);
    } finally {
      setAnalyzingAvatar(false);
    }
  };

  const testAvatarGeneration = async () => {
    setLoading(prev => ({ ...prev, avatar: true }));
    try {
      const requestBody: any = { prompt: "" }; // Empty prompt, will default to "create"
      
      // Add kid's image URL if a kid is selected
      if (selectedKid?.avatarUrl) {
        requestBody.kidImageUrl = selectedKid.avatarUrl;
      } else {
        // If no kid is selected, show an error
        setAvatarResult({
          success: false,
          error: "Please select a kid with an image to generate an avatar",
          timestamp: new Date(),
        });
        return;
      }
      
      const response = await fetch('/api/ai-bots/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate avatar');
      }
      
      setAvatarResult({
        success: true,
        data: data,
        timestamp: new Date(),
      });

      // Automatically analyze the generated avatar if it contains an image
      if (data?.output?.[0]?.result) {
        await analyzeGeneratedAvatar(data.output[0].result);
      }
    } catch (error) {
      setAvatarResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      });
    } finally {
      setLoading(prev => ({ ...prev, avatar: false }));
    }
  };

  const testStoryImageGeneration = async () => {
    if (!storyImagePrompt.trim() && !selectedKid?.avatarUrl) return;
    
    setLoading(prev => ({ ...prev, storyImage: true }));
    try {
      const requestBody: any = { prompt: storyImagePrompt };
      
      // Add kid's image URL if a kid is selected
      if (selectedKid?.avatarUrl) {
        requestBody.referenceImageUrl = selectedKid.avatarUrl;
      }
      
      const response = await fetch('/api/ai-bots/story-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate story image');
      }
      
      setStoryImageResult({
        success: true,
        data: data,
        timestamp: new Date(),
      });
    } catch (error) {
      setStoryImageResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      });
    } finally {
      setLoading(prev => ({ ...prev, storyImage: false }));
    }
  };

  const testStoryGeneration = async () => {
    if (!storyPrompt.trim()) return;
    
    setLoading(prev => ({ ...prev, story: true }));
    try {
      const response = await fetch('/api/ai-bots/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: storyPrompt }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate story');
      }
      
      setStoryResult({
        success: true,
        data: data,
        timestamp: new Date(),
      });
    } catch (error) {
      setStoryResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      });
    } finally {
      setLoading(prev => ({ ...prev, story: false }));
    }
  };

  const ResultDisplay = ({ result, title }: { result: TestResult | null; title: string }) => {
    if (!result) return null;

    // Helper function to extract images from the response
    const extractImages = (data: any) => {
      const images: string[] = [];
      
      // Check for new simplified response format
      if (data?.data?.imageUrl) {
        images.push(data.data.imageUrl);
        return images;
      }
      
      // Fallback to old format
      if (data?.output && Array.isArray(data.output)) {
        data.output.forEach((item: any) => {
          if (item.result && typeof item.result === 'string') {
            // Check if it's a base64 image or text
            if (item.result.startsWith('/9j/') || item.result.startsWith('iVBOR') || item.result.startsWith('data:')) {
              images.push(item.result);
            }
          }
        });
      }
      
      return images;
    };

    // Helper function to extract text from the response
    const extractText = (data: any) => {
      const texts: string[] = [];
      
      if (data?.output && Array.isArray(data.output)) {
        data.output.forEach((item: any) => {
          if (item.result && typeof item.result === 'string') {
            // Check if it's text (not base64 image)
            if (!item.result.startsWith('/9j/') && !item.result.startsWith('iVBOR') && !item.result.startsWith('data:')) {
              texts.push(item.result);
            }
          }
        });
      }
      
      return texts;
    };

    const images = result.success ? extractImages(result.data) : [];
    const texts = result.success ? extractText(result.data) : [];

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title}
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.success ? "Success" : "Error"}
            </Badge>
            <Badge variant="outline">
              {result.timestamp.toLocaleTimeString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <div className="space-y-4">
              {images.length > 0 && (
                <div className="space-y-2">
                  <Label>Generated Images:</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {images.map((imageData, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <img 
                          src={imageData.startsWith('http') ? imageData : `data:image/png;base64,${imageData}`}
                          alt={`Generated image ${index + 1}`}
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {texts.length > 0 && (
                <div className="space-y-2">
                  <Label>Generated Content:</Label>
                  <div className="space-y-3">
                    {texts.map((text, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-md border">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Response Data:</Label>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Error:</Label>
              <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-800">
                {result.error}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Custom Story Result Display
  const StoryResultDisplay = ({ result }: { result: TestResult | null }) => {
    if (!result) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Story Generation Result
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.success ? "Success" : "Error"}
            </Badge>
            <Badge variant="outline">
              {result.timestamp.toLocaleTimeString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <div className="space-y-4">
              {/* Check if it's structured story data */}
              {result.data?.pages && Array.isArray(result.data.pages) ? (
                <div className="space-y-4">
                  <Label>Generated Story Pages:</Label>
                  {result.data.pages.map((page: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Page {page.pageNum}</Badge>
                        <Badge variant="secondary">{page.pageType}</Badge>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Text:</Label>
                          <div className="text-sm text-gray-700 mt-1 p-2 bg-white rounded border">
                            {page.text}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Image Prompt:</Label>
                          <div className="text-xs text-gray-600 mt-1 p-2 bg-white rounded border max-h-32 overflow-y-auto">
                            {page.imagePrompt}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback for non-structured response
                <div className="space-y-2">
                  <Label>Generated Story:</Label>
                  <div className="bg-gray-50 p-4 rounded-md border">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Response Data:</Label>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Error:</Label>
              <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-800">
                {result.error}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Custom Avatar Result Display with Analysis
  const AvatarResultDisplay = ({ result }: { result: TestResult | null }) => {
    if (!result) return null;

    // Helper function to extract images from the response
    const extractImages = (data: any) => {
      const images: string[] = [];
      
      // Check for new simplified response format
      if (data?.data?.imageUrl) {
        images.push(data.data.imageUrl);
        return images;
      }
      
      // Fallback to old format
      if (data?.output && Array.isArray(data.output)) {
        data.output.forEach((item: any) => {
          if (item.result && typeof item.result === 'string') {
            images.push(item.result);
          }
        });
      }
      
      return images;
    };

    const images = result.success ? extractImages(result.data) : [];

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Avatar Generation Result
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.success ? "Success" : "Error"}
            </Badge>
            <Badge variant="outline">
              {result.timestamp.toLocaleTimeString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <div className="space-y-4">
              {images.length > 0 && (
                <div className="space-y-2">
                  <Label>Generated Avatar:</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {images.map((imageData, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <img 
                          src={imageData.startsWith('http') ? imageData : `data:image/png;base64,${imageData}`}
                          alt={`Generated avatar ${index + 1}`}
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Avatar Analysis Section */}
              {analyzingAvatar && (
                <div className="space-y-2">
                  <Label>Avatar Analysis:</Label>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">Analyzing generated avatar...</span>
                  </div>
                </div>
              )}

              {avatarAnalysis && !analyzingAvatar && (
                <div className="space-y-2">
                  <Label>Avatar Character Description:</Label>
                  <div className="p-3 bg-green-50 rounded-md">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-48">{avatarAnalysis}</pre>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Response Data:</Label>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Error:</Label>
              <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-800">
                {result.error}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Bots Test Page</h1>
        <p className="text-gray-600">
          Test your OpenAI bots - Avatar Image, Story Image, and Full Story generation
        </p>
      </div>

      <Tabs defaultValue="avatar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="avatar" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Avatar AI
          </TabsTrigger>
          <TabsTrigger value="story-image" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Story Image AI
          </TabsTrigger>
          <TabsTrigger value="story" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Full Story AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="avatar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Avatar Image Generation</CardTitle>
              <CardDescription>
                Generate avatar images from a kid's photo using the Avatar Image AI bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kid-selection">Select Kid (Required)</Label>
                <Select value={selectedKidId} onValueChange={setSelectedKidId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a kid to use their image as reference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No kid selected</SelectItem>
                    {kids.map((kid) => (
                      <SelectItem key={kid.id} value={kid.id}>
                        {kid.name || `Kid ${kid.id}`} {kid.avatarUrl ? "📷" : "❌"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedKid && (
                  <div className="text-sm text-gray-600">
                    Selected: {selectedKid.name || `Kid ${selectedKid.id}`}
                    {selectedKid.avatarUrl ? (
                      <span className="text-green-600"> ✓ Has image</span>
                    ) : (
                      <span className="text-red-600"> ✗ No image</span>
                    )}
                  </div>
                )}
              </div>

              
              <Button 
                onClick={testAvatarGeneration}
                disabled={loading.avatar || !selectedKid?.avatarUrl}
                className="w-full"
              >
                {loading.avatar ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Avatar...
                  </>
                ) : (
                  "Generate Avatar"
                )}
              </Button>
            </CardContent>
          </Card>
          
          <AvatarResultDisplay result={avatarResult} />
        </TabsContent>

        <TabsContent value="story-image" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Story Image Generation</CardTitle>
              <CardDescription>
                Generate story images using the Story Image AI bot. You can use a kid's image as reference or just text prompts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="story-image-prompt">Prompt (Optional if using reference image)</Label>
                <Input
                  id="story-image-prompt"
                  placeholder="A magical forest with talking animals..."
                  value={storyImagePrompt}
                  onChange={(e) => setStoryImagePrompt(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="kid-selection-story">Select Kid for Reference Image (Optional)</Label>
                <Select value={selectedKidId} onValueChange={setSelectedKidId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a kid to use their image as reference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reference image</SelectItem>
                    {kids.map((kid) => (
                      <SelectItem key={kid.id} value={kid.id}>
                        {kid.name || `Kid ${kid.id}`} {kid.avatarUrl ? "📷" : "❌"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedKid && (
                  <div className="text-sm text-gray-600">
                    Selected: {selectedKid.name || `Kid ${selectedKid.id}`}
                    {selectedKid.avatarUrl ? (
                      <span className="text-green-600"> ✓ Will use as reference</span>
                    ) : (
                      <span className="text-red-600"> ✗ No image available</span>
                    )}
                  </div>
                )}
              </div>
              
              <Button 
                onClick={testStoryImageGeneration}
                disabled={loading.storyImage || (!storyImagePrompt.trim() && !selectedKid?.avatarUrl)}
                className="w-full"
              >
                {loading.storyImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Story Image...
                  </>
                ) : (
                  "Generate Story Image"
                )}
              </Button>
            </CardContent>
          </Card>
          
          <ResultDisplay result={storyImageResult} title="Story Image Generation Result" />
        </TabsContent>

        <TabsContent value="story" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Full Story Generation</CardTitle>
              <CardDescription>
                Generate complete stories using the Full Story AI bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="story-prompt">Prompt</Label>
                <Textarea
                  id="story-prompt"
                  placeholder="A story about a young detective solving mysteries in a small town..."
                  value={storyPrompt}
                  onChange={(e) => setStoryPrompt(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                onClick={testStoryGeneration}
                disabled={loading.story || !storyPrompt.trim()}
                className="w-full"
              >
                {loading.story ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Story...
                  </>
                ) : (
                  "Generate Full Story"
                )}
              </Button>
            </CardContent>
          </Card>
          
          <StoryResultDisplay result={storyResult} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
