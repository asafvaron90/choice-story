import { Story, KidDetails, StoryPage, PageType, pageTypeFromString, getKidName } from "@/models";
import { getRemoteConfigValue } from "@/lib/remote_config";

export class StoryTemplates {

  private static _fullStoryTextGenerationTemplate: string | null = null;

  private static async getFullStoryTextGenerationTemplate(): Promise<string> {
    if (!this._fullStoryTextGenerationTemplate) {
      this._fullStoryTextGenerationTemplate = await getRemoteConfigValue('ai_full_story_text_request_prompt');
    }
    return this._fullStoryTextGenerationTemplate;
  }
  

  private static generateBaseContext(story: Story, kid: KidDetails) {
    const kidName = getKidName(kid);
    return `Title: ${story.title}
            Description: ${story.problemDescription}
            Moral: Focus on making good choices
            Motive: Help ${kidName} learn about good decision making
            Age: ${kid.age}
            Gender: ${kid.gender}
            Kid name: ${kidName}
            Idea: A story about making choices with consequences
            Limitations: Keep content age-appropriate for a ${kid.age} year old ${kid.gender}
            Keywords: choices, learning, growth, decision making`;
    }

  // TEXT SECTION 
  static generateTextBaseTemplate(story: Story, kid: KidDetails) {
    return `Story context: ${this.generateBaseContext(story, kid)}
            Reading Style: Simple, engaging, and appropriate for a ${kid.age} year old`;
  }

  // private static generateStoryTextExpectedResponse(){
  //   return `
  //     - Cover page text (as close as possible to the title)
  //     - 3-5 normal pages (last page is dillema)
  //     - Choices pages (1 good, 1 bad)
  //     - 3-5 good flow pages
  //     - 3-5 bad flow pages
  //   `
  // }

  // IMAGE SECTION 
  // private static generateImageBaseTemplate(story: Story, kid: KidDetails) {
  //   return `Main Character Characteristics: 
  //           - ${kid.age} years old ${kid.gender} 
  //           - ${kid.imageAnalysis}
  //           - reference img: ${kid.avatarUrl}

  //           Story context: 
  //           - ${this.generateBaseContext(story, kid)}
            
  //           Image Style: Pixar-like 3D animation
            
  //           Instructions:
  //           - Create a detailed illustration that matches the text exactly
  //           - Focus on the main character who should be a ${kid.age} year old ${kid.gender}
  //           - Ensure the image clearly depicts the action and emotion described in the scene
  //           - Keep all content child-friendly and appropriate for a ${kid.age} year old
  //           - Use bright, engaging colors and expressive characters`;
  // }

  // unused
  // static generateStoryImageTemplate(story: Story, kid: KidDetails, pageText: string){
  //   return `${this.generateImageBaseTemplate(story, kid)}

  //           Current Scene Description: 
  //           ${pageText}`;
  // }

  static async fullStoryTextGeneration(title: string, problemDescription: string, age: number, name: string): Promise<string>{
   // Get the function template from Firebase Remote Config
   const template = await this.getFullStoryTextGenerationTemplate();
   
   // Replace the placeholders in the template with the actual values
   return template
     .replace(/\${title}/g, title)
     .replace(/\${problemDescription}/g, problemDescription)
     .replace(/\${age}/g, age.toString())
     .replace(/\${name}/g, name);
  }

  static fullStoryTextGenerationResponseConvertor(response: string): StoryPage[] | null {
    try {
        let jsonText = response;
        
        // Remove markdown code blocks if present (```json, ```, etc.)
        jsonText = jsonText.replace(/```(json)?/g, '').trim();
        
        // Remove any leading/trailing backticks
        jsonText = jsonText.replace(/^`+|`+$/g, '').trim();
        
        console.log("Attempting to parse JSON:", jsonText.substring(0, 200) + "...");
        
        // Check if JSON is truncated and try to fix it
        if (!jsonText.endsWith('}') && !jsonText.endsWith(']}')) {
          console.warn("JSON appears to be truncated, attempting to fix...");
          
          // Try to find the last complete page
          const lastCompletePageIndex = jsonText.lastIndexOf('},');
          if (lastCompletePageIndex > -1) {
            // Truncate to last complete page and close the JSON properly
            const truncatedJson = jsonText.substring(0, lastCompletePageIndex + 1) + ']}';
            console.log("Fixed truncated JSON:", truncatedJson.substring(truncatedJson.length - 100));
            jsonText = truncatedJson;
          } else {
            // If we can't find a complete page, try to close the JSON structure
            if (jsonText.includes('"pages": [')) {
              if (!jsonText.endsWith(']}')) {
                jsonText += ']}';
              }
            } else if (!jsonText.endsWith('}')) {
              jsonText += '}';
            }
          }
        }
        
        const parsedData = JSON.parse(jsonText);
        
        if (parsedData && parsedData.pages && Array.isArray(parsedData.pages)) {
          // Map the generated pages to the StoryPage model
          const storyPages: StoryPage[] = [];
          
          for (const page of parsedData.pages) {
            
            // First try to convert using our utility function
            const pageType: PageType = pageTypeFromString(page.pageType);
            
            storyPages.push({
              pageType,
              storyText: page.text,
              pageNum: page.pageNum,
              imagePrompt: page.imagePrompt
            });
          }
          
          // Debug log to help diagnose page type mapping issues
          console.log("Generated story pages with types:", storyPages.map(p => ({ 
            num: p.pageNum, 
            type: p.pageType, 
            text: p.storyText.substring(0, 30) + "...",
            imagePrompt: p.imagePrompt?.substring(0, 30) + "..."
          })));
          
          // Return the array of story pages
          return storyPages;
          
        } else {
          throw new Error("Invalid response format");
        }
    } catch (parseError) {
      console.error("Error parsing story data:", parseError);
      
      // Provide more specific error messages for common issues
      if (parseError instanceof Error) {
        const errorMsg = parseError.message;
        
        // Authentication/API key issues
        if (
          errorMsg.includes('Authentication Error') || 
          errorMsg.includes('API Key') || 
          errorMsg.includes('AUTH_ERROR') ||
          errorMsg.includes('unregistered callers') ||
          errorMsg.includes('403')
        ) {
          console.log("Unable to connect to the AI service. Please contact support or try again later.");
        } 
        // JSON parsing issues
        else if (errorMsg.includes('parse') || errorMsg.includes('JSON')) {
          console.log("There was an issue processing the AI response. Please try again.");
        }
        // Other errors
        else {
          console.log(errorMsg);
        }
      } else {
        console.log("Failed to generate story. Please try again.");
      }
      
      return null;
    }
  }

  static titleGeneration(problemDescription: string, kidDetails: KidDetails) {
    const kidName = getKidName(kidDetails);
    return `
    base knowledge:
    - this is a children's story about a child who is dealing with a problem in pixar style.
    - the titles should be in the same language as the problem description.
    - title must contian the kid name ${kidDetails.name} (should be in the same language as the problem description)

    task:
    Generate 5 creative and engaging story titles for a children's story about ${kidName || 'a child'} 
      (${kidDetails?.age || 5} year old ${kidDetails?.gender || 'child'}) 
      who is dealing with the following problem: ${problemDescription}.
      
      Format the response as valid JSON with structure:
      { 
        "titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]
      }
      Do not include markdown formatting or backticks in your response, just the raw JSON.`
  }

  static titleGenerationResponseConvertor(response: string,): string[] | null {
    try {
        // Clean the response text to handle markdown formatting
        let jsonText = response;
        
        // Remove markdown code blocks if present (```json, ```, etc.)
        jsonText = jsonText.replace(/```(json)?/g, '').trim();
        
        // Remove any leading/trailing backticks
        jsonText = jsonText.replace(/^`+|`+$/g, '').trim();
        
        const parsedData = JSON.parse(jsonText);
        if (parsedData && parsedData.titles && Array.isArray(parsedData.titles)) {
          return parsedData.titles;
        } else {
          throw new Error("Invalid response format");
        }
      } catch (parseError) {
        console.error("Error parsing title data:", parseError);
        throw new Error("Failed to parse generated titles");
      }
    } 
  }
