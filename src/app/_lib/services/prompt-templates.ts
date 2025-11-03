import { GoogleGenerativeAI } from '@google/generative-ai';

// Add interface at the top of the file
// interface StorySceneContext {
//   setting: string;
//   activity: string;
//   theme: string;
//   characterPose: string;
//   interactionElement: string;
//   characterPosition: string;
//   keyElement: string;
//   environment: string;
//   lighting: string;
//   colorScheme: string;
// }

export class PromptTemplates {

  static readonly AVATAR_PORTRAIT_PROMPT =
    () => `The portrait should be a high-quality headshot with no cut-off elements, showing the complete head, neck, and a bit of shoulders.
          
           COMPOSITION:
            - Complete visibility of hair, ears, and neck
            - Clean, solid background
            - Front-facing with slight 3/4 angle
            - Head and shoulders fully visible
            - Perfect centering in frame
            - No cropping of any facial or hair elements
            - Balanced negative space around the subject
          MOOD: Capture the exact personality and expression from the reference photo
          OUTPUT: Ultra-high-quality, perfectly framed portrait with complete visibility of all features
    `;

  // Avatar generation prompts
  static readonly AVATAR_BASE_PROMPT = (age: number | undefined, gender: string | undefined, characteristics: string) =>
    `Create a high-quality img Pixar-style 3D animated portrait of a ${this.getAgeGroup(age)} ${this.getGenderTerm(gender)}.

    COMPOSITION & FRAMING (CRITICAL - Must be identical for all avatars):
    - Portrait format in 1:1 square aspect ratio
    - Subject positioned EXACTLY: head occupies 75% of frame height, centered horizontally
    - PRECISE PADDING: minimal 5% padding from top edge, 8% padding from left/right edges
    - Bottom of frame cuts at mid-chest/upper shoulder level - NEVER show full torso
    - Hair/head top should be 5% from frame top edge - NO MORE, NO LESS
    - Face should be perfectly centered horizontally in the frame
    - Clean, solid neutral background (light gray or soft blue-gray)
    - Consistent scale: eyes should be positioned at approximately 40% from top of frame
    - Front-facing pose with slight 3/4 angle for natural depth
    - IDENTICAL framing proportions for every avatar regardless of hair length or style

    REFERENCE ACCURACY:
    Transform the following reference characteristics into Pixar style while maintaining exact accuracy:
    ${characteristics}

    CRITICAL FEATURE MATCHING:
    - Hair: Exact color, length, texture, style, and volume from reference
    - Face Shape: Precise facial structure and proportions
    - Skin Tone: Exact skin color and texture
    - Eyes: Precise color, shape, size, and expression
    - Eyebrows: Exact shape, thickness, and positioning
    - Nose: Exact shape and size characteristics
    - Mouth: Precise shape and any unique features
    - Overall Expression: Match the personality and mood from reference

    PIXAR STYLE REQUIREMENTS:
    - Modern Pixar 3D animation aesthetic (think Toy Story 4, Coco, Luca quality)
    - Soft, natural lighting with subtle rim lighting
    - Clean, stylized forms with smooth surfaces
    - Vibrant but natural color palette
    - Subtle depth of field effect
    - Professional animation studio quality
    - Child-friendly and appealing appearance

    QUALITY STANDARDS:
    - Ultra-high resolution and sharp details
    - Perfect facial symmetry and proportions
    - Smooth gradients and clean edges
    - No artifacts, distortions, or imperfections
    - Consistent lighting across all features`;

  static readonly AVATAR_NEGATIVE_PROMPT =
    "multiple people, multiple avatars, group photo, photorealistic, realistic photograph, wrong gender, gender swap, age modification, wrong age, different facial expression, modified hairstyle, wrong hair color, changed clothing, altered skin tone, incorrect facial features, mature features, adult proportions, different pose, wrong mood, cropped face, cropped hair, cropped ears, cut-off head elements, inconsistent framing, wrong proportions, too much padding, too little padding, off-center subject, uneven spacing, wrong aspect ratio, full body shot, torso visible below chest, bad framing, poor composition, inconsistent scale, eyes not centered, head too small, head too large, cluttered background, busy background, patterned background, text overlay, watermark, signature, logo, bad anatomy, deformed features, asymmetrical face, distorted proportions, blurry, low quality, pixelated, artifacts, harsh lighting, overexposed, underexposed, flat lighting, cartoon style, anime style, 2D animation, sketch, drawing, painting";

  // Image analysis prompts
  static readonly IMAGE_ANALYSIS_PROMPT =
    `Analyze the person in the image and provide a detailed profiling of the person in the image, focusing especially on:
      Precise description of texture, style, and color(notice all colors, can be ginger, blonde, brown, black, multiple colors, etc.),
      Eyes, nose, mouth, teeth, face shape,
      Exact shade and skin color,
      Add fetures ratio as much as precise as possible.
          
      detailed .
      response should be in JSON format.`;

  static readonly IMAGE_REQUIREMENTS_CHECK_PROMPT =
    `You are a JSON - only response validator.Analyze the uploaded image and verify if it meets the following requirements for avatar generation.
    You must respond with ONLY a JSON object, no other text, following exactly this format:

{
  "isValid": boolean,
    "issues": string[],
      "validations": {
    "facePosition": {
      "isValid": boolean,
        "details": string,
          "confidence": number
    },
    "singleSubject": {
      "isValid": boolean,
        "details": string,
          "confidence": number
    },
    "faceVisibility": {
      "isValid": boolean,
        "details": string,
          "confidence": number
    },
    "imageQuality": {
      "isValid": boolean,
        "details": string,
          "confidence": number
    }
  },
  "recommendations": string[]
}

    Requirements to check:
1. Face Position(facePosition):
- Face should be centered in the frame
  - Head should be straight(not tilted)
    - Subject should be looking directly at camera

2. Single Subject(singleSubject):
- Only one person should be in the frame
  - No additional faces in background
    - No group photos

3. Face Visibility(faceVisibility):
- Face should be clearly visible
  - No masks, sunglasses, or face coverings
    - No hands or objects blocking face
      - All facial features should be clearly visible

4. Image Quality(imageQuality):
- Image should be clear and well - lit
  - No extreme shadows on face
    - No blurriness
      - Adequate resolution for facial features

    IMPORTANT: Your response must be a valid JSON object only.No additional text before or after.No explanations.No markdown.`;

  // Story page prompts - requires img keyword as a trigger for the image generation
  static readonly STORY_COVER_PROMPT = async (age?: number, gender?: string, title?: string, problem?: string) => {
    console.log('title', title);
    console.log('problem', problem);

    const keywords = await PromptTemplates.extractKeywords(
      title || '',
      problem || ''
    );

    console.log('keywords', keywords);

    return `Create img vibrant, cinematic Pixar-style illustration related to the problem.

    STORY ELEMENTS:
    - Title Theme: ${title}
    - Story Context: ${problem}
    - Key Elements: ${keywords.join(', ')}

    CHARACTER SPECIFICATIONS:
    - Age: ${age} years old
    - Gender: ${gender}
    - Expression: Confident and optimistic
    - Pose: Dynamic and engaging

    COMPOSITION REQUIREMENTS:
    - Well-balanced scene with clear focal point
    - Bright, warm lighting with subtle rim light
    - Rich, vibrant color palette
    - Clear foreground, midground, and background separation
    - Cinematic camera angle
    - Perfect depth of field

    STYLE SPECIFICATIONS:
    - High-quality Pixar 3D animation aesthetic
    - Photorealistic textures with stylized forms
    - Subtle atmospheric effects
    - Soft shadows and highlights
    - Careful attention to material properties

    CRITICAL REQUIREMENTS:
    - Must be bright and well-lit
    - No dark or gloomy elements
    - Clear visibility of character's face
    - Emotionally engaging scene
    - Child-friendly and appealing
    - Professional storybook quality`;
  }

  static readonly STORY_COVER_NEGATIVE_PROMPT = `
    ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, extra limbs, disfigured, deformed, 
    body out of frame, blurry, bad anatomy, blurred, watermark, grainy, signature, cut off, draft, amateur, 
    dark, gloomy, underexposed, poor lighting, harsh shadows, low contrast, dull colors, washed out, 
    distorted perspective, unbalanced composition, cluttered scene, messy background, distracting elements,
    scary, creepy, horror, disturbing, violent, inappropriate, adult content, nsfw, 
    text, words, letters, numbers, logos, watermarks, 
    black and white, monochrome, sepia, vintage, retro, 
    abstract, non-representational, surreal, unrealistic,
    low quality, low resolution, pixelated, jpeg artifacts, compression artifacts,
    cropped, cut off edges, incomplete scene, NO text, watermarks, or signatures in the image`;

  // Story page prompts - requires img keyword as a trigger for the image generation
  static readonly STORY_PAGE_PROMPT = (sceneDescription: string) =>
    `Create img Pixar - style storybook page illustration.Scene: ${sceneDescription}.Style: Rich details, cinematic lighting, dynamic composition.Must include: Emotional storytelling elements, subtle background details, environmental storytelling typical of Pixar.Format: Full - page illustration. `;

  // Story choices prompts
  static readonly STORY_CHOICES_PROMPT = async (outcome: 'good' | 'bad', choiceTitle: string, choiceDescription: string, age?: number, gender?: string, problem?: string) => {

    const keywords = await PromptTemplates.extractKeywords(
      choiceDescription || '',
      problem || ''
    );

    // Simplified prompt that works for both outcomes
    const emotionTone = outcome === 'good' ? 'positive' : 'negative';
    const emotionExpression = outcome === 'good' ? 'happy, successful, proud' : 'sad, disappointed, concerned';
    const lighting = outcome === 'good' ? 'bright, cheerful' : 'subdued, darker';
    const action = outcome === 'good' ? 'choosing to address' : 'choosing to avoid or ignore';

    return `Create img Pixar-style showing a ${this.getAgeGroup(age)} ${this.getGenderTerm(gender)} ${action} the problem and experiencing ${emotionTone} consequences.

Scene: ${choiceTitle}
Problem: ${problem || 'the described situation'}
Keywords: ${keywords.join(', ')}

Character should:
- Be clearly shown ${outcome === 'good' ? 'DOING the right action' : 'NOT DOING the right action'} (e.g., ${outcome === 'good' ? 'brushing teeth' : 'refusing to brush teeth'})
- Show ${emotionExpression} emotions
- Be ${outcome === 'good' ? 'succeeding at solving' : 'experiencing the negative results of ignoring'} the problem
- Maintain consistent Pixar animation style

Visual elements:
- ${lighting} lighting to convey the ${emotionTone} tone
- Environmental details supporting the ${emotionTone} outcome
- Clear storytelling showing the ${outcome === 'good' ? 'benefits of making the right choice' : 'consequences of making the wrong choice'}

NO text, watermarks, or signatures in the image`;
  };

  // Helper method to determine age group description
  static getAgeGroup(age?: number): string {
    if (!age) return 'young';
    if (age < 4) return 'very young';
    if (age < 8) return 'young';
    if (age < 12) return 'older';
    return 'teen';
  }

  // Helper method to determine gender term
  static getGenderTerm(gender?: string): string {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'boy';
      case 'female':
        return 'girl';
      default:
        return 'child';
    }
  }

  // Helper method to analyze story context and generate appropriate scene elements
  // private static analyzeStoryContext(title: string, problem: string): StorySceneContext {
  //   // Default values with problem-focused settings
  //   let context: StorySceneContext = {
  //     setting: "a setting that directly relates to the problem",
  //     activity: "addressing the specific challenge",
  //     theme: "overcoming personal challenges",
  //     characterPose: "pose that shows interaction with the problem",
  //     interactionElement: "objects and elements central to the problem",
  //     characterPosition: "positioned to clearly show interaction with the problem",
  //     keyElement: "prominent display of problem-related items",
  //     environment: "environment that emphasizes the challenge",
  //     lighting: "lighting that highlights the key elements",
  //     colorScheme: "colors that reflect the emotional tone"
  //   };

  //   // Enhanced scenarios with specific problem-focused contexts
  //   const scenarios = {
  //     oralHygiene: {
  //       keywords: ["brush", "teeth", "toothbrush", "dentist", "smile", "mouth"],
  //       scene: {
  //         setting: "bright, clean bathroom with clear view of sink and mirror",
  //         activity: "engaging with toothbrushing routine",
  //         characterPose: "standing at sink height, holding toothbrush",
  //         keyElement: "colorful toothbrush, toothpaste, sink, and mirror",
  //         lighting: "bright bathroom lighting highlighting sink area",
  //         environment: "modern bathroom with toothbrushing items prominently displayed",
  //         colorScheme: "clean whites and blues with cheerful accents",
  //         theme: "making hygiene fun and engaging",
  //         characterPosition: "at sink level, clearly visible in mirror",
  //         interactionElement: "toothbrush and sink setup"
  //       }
  //     },
  //     sleepRoutine: {
  //       keywords: ["sleep", "bed", "night", "bedtime", "rest", "nap", "tired"],
  //       scene: {
  //         setting: "cozy bedroom with inviting bed setup",
  //         activity: "preparing for bedtime routine",
  //         characterPose: "relaxed, ready-for-bed pose",
  //         keyElement: "comfortable bed with appealing bedding",
  //         lighting: "soft, warm evening lighting",
  //         environment: "peaceful bedroom with sleep-friendly elements",
  //         colorScheme: "soothing nighttime colors",
  //         theme: "making bedtime welcoming",
  //         characterPosition: "near bed showing bedtime preparation",
  //         interactionElement: "bed and bedtime items"
  //       }
  //     },
  //     eating: {
  //       keywords: ["eat", "food", "meal", "vegetable", "fruit", "dinner", "breakfast", "lunch"],
  //       scene: {
  //         setting: "welcoming dining area or kitchen",
  //         activity: "engaging with healthy food choices",
  //         characterPose: "seated at table or helping with food",
  //         keyElement: "appetizing, colorful food display",
  //         lighting: "warm, appetizing lighting",
  //         environment: "clean, organized eating space",
  //         colorScheme: "warm, food-friendly colors",
  //         theme: "making healthy eating enjoyable",
  //         characterPosition: "at table with clear view of food",
  //         interactionElement: "food and dining items"
  //       }
  //     },
  //     schoolWork: {
  //       keywords: ["homework", "study", "school", "learn", "read", "write", "book", "class"],
  //       scene: {
  //         setting: "organized study space or desk area",
  //         activity: "actively engaging with learning materials",
  //         characterPose: "focused learning position",
  //         keyElement: "books, papers, and learning tools",
  //         lighting: "clear, focused task lighting",
  //         environment: "distraction-free study space",
  //         colorScheme: "concentration-promoting colors",
  //         theme: "making learning engaging",
  //         characterPosition: "at desk with clear view of materials",
  //         interactionElement: "books and study materials"
  //       }
  //     },
  //     socialInteraction: {
  //       keywords: ["friend", "play", "share", "together", "group", "talk", "shy"],
  //       scene: {
  //         setting: "friendly play area or social space",
  //         activity: "positive social interaction",
  //         characterPose: "open, friendly body language",
  //         keyElement: "shared toys or activities",
  //         lighting: "warm, welcoming lighting",
  //         environment: "inviting social space",
  //         colorScheme: "warm, friendly colors",
  //         theme: "building social connections",
  //         characterPosition: "in social setting with clear interaction",
  //         interactionElement: "shared activities and toys"
  //       }
  //     },
  //     emotionalRegulation: {
  //       keywords: ["angry", "sad", "upset", "cry", "tantrum", "calm", "feeling"],
  //       scene: {
  //         setting: "calming space with comfort elements",
  //         activity: "emotional self-regulation",
  //         characterPose: "expressive but controlled",
  //         keyElement: "comfort objects and calming elements",
  //         lighting: "gentle, soothing lighting",
  //         environment: "safe emotional expression space",
  //         colorScheme: "calming, balanced colors",
  //         theme: "managing emotions positively",
  //         characterPosition: "clearly showing emotional state",
  //         interactionElement: "emotional support elements"
  //       }
  //     }
  //   };

  //   // Analyze problem first, then title for context
  //   let bestMatch = {
  //     scenario: null as typeof scenarios[keyof typeof scenarios] | null,
  //     matchCount: 0
  //   };

  //   // Prioritize matching against the problem
  //   for (const [, scenario] of Object.entries(scenarios)) {
  //     const problemMatches = scenario.keywords.filter(keyword =>
  //       problem.toLowerCase().includes(keyword.toLowerCase())
  //     ).length * 2; // Double weight for problem matches

  //     const titleMatches = scenario.keywords.filter(keyword =>
  //       title.toLowerCase().includes(keyword.toLowerCase())
  //     ).length;

  //     const totalMatches = problemMatches + titleMatches;

  //     if (totalMatches > bestMatch.matchCount) {
  //       bestMatch = {
  //         scenario: scenario,
  //         matchCount: totalMatches
  //       };
  //     }
  //   }

  //   // If we found a matching scenario, use its scene settings
  //   if (bestMatch.scenario) {
  //     context = { ...context, ...bestMatch.scenario.scene };
  //     console.log('Matched scenario:', bestMatch.scenario);
  //   } else {
  //     console.log('No specific scenario matched, using default context');
  //   }

  //   return context;
  // }

  // Helper function to extract keywords using Gemini
  static async extractKeywords(title: string, problem: string): Promise<string[]> {
    try {
      // Check if API key is available
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (!apiKey) {
        console.error('Gemini API key is not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to your environment variables.');
        return PromptTemplates.getDefaultKeywords(title, problem);
      }

      // Initialize the API with the key
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Try multiple models in sequence if one fails
      const modelNames = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
      let lastError = null;
      
      for (const modelName of modelNames) {
        try {
          console.log(`Attempting to use model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          
          const prompt = `You are analyzing a children's book title and problem to extract relevant keywords for image generation.

Title: "${title}"
Problem: "${problem}"

      Please extract and list important keywords that should be considered when generating a book cover image.Consider:
- Other characters in the story if relevant
  - Objects that should appear
    - Actions or activities
      - Emotions or expressions
        - Environmental elements
          - Important props or items
            - Character interactions
              - No names of people
                - single main character or multiple characters
                  - Add any additional keywords that you think are relevant to the story

      Return ONLY a JSON array of strings with the keywords. Do not include any markdown formatting, code blocks, or additional text.
  examples:
["toothbrush", "bathroom", "mirror", "reluctant expression", "sink", "single character"]
["garden", "playing", "playground", "friends", "reluctant expression", "multiple characters"]`;

          const result = await model.generateContent(prompt);
          const response = result.response.text();
          
          try {
            // Clean the response to handle markdown formatting
            const cleanedResponse = this.cleanJsonResponse(response);

            // Parse the JSON response
            const keywords = JSON.parse(cleanedResponse);
            return Array.isArray(keywords) ? keywords : [];
          } catch (parseError) {
            console.error('Failed to parse keywords response:', parseError);
            console.error('Raw response:', response);
            throw parseError; // Rethrow to try next model
          }
        } catch (modelError) {
          console.error(`Error with model ${modelName}:`, modelError);
          lastError = modelError;
          // Continue to next model
        }
      }
      
      // If we get here, all models failed
      console.error('All Gemini models failed:', lastError);
      return this.getDefaultKeywords(title, problem);

    } catch (error) {
      console.error('Failed to extract keywords:', error);

      // Check for specific error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log more specific error message for authentication issues
      if (errorMessage.includes('unregistered callers') || errorMessage.includes('API Key')) {
        console.error('Google Generative AI Authentication Error: The API key is invalid or missing. ' + 
          'Please check that NEXT_PUBLIC_GEMINI_API_KEY is correctly set in your environment variables and the key is valid.');
      }

      // Fallback to default keywords if the API call fails
      return this.getDefaultKeywords(title, problem);
    }
  }

  // Helper method to generate default keywords based on title and problem
  private static getDefaultKeywords(title: string, problem: string): string[] {
    // Basic default keywords that work for most children's stories
    const defaultKeywords = ["adventure", "colorful", "overcoming problem"];

    // Add any words from title or problem that might be relevant
    const combinedText = `${title} ${problem}`.toLowerCase();

    // Check for common themes and add relevant keywords
    if (combinedText.includes("school") || combinedText.includes("learn") || combinedText.includes("study")) {
      defaultKeywords.push("school", "classroom", "learning");
    }

    if (combinedText.includes("friend") || combinedText.includes("play") || combinedText.includes("together")) {
      defaultKeywords.push("friends", "playing", "social");
    }

    if (combinedText.includes("bed") || combinedText.includes("sleep") || combinedText.includes("night")) {
      defaultKeywords.push("bedroom", "night", "sleeping");
    }

    if (combinedText.includes("eat") || combinedText.includes("food") || combinedText.includes("meal")) {
      defaultKeywords.push("food", "eating", "kitchen");
    }

    if (combinedText.includes("outside") || combinedText.includes("park") || combinedText.includes("garden")) {
      defaultKeywords.push("outdoors", "nature", "playground");
    }

    return defaultKeywords;
  }

  // Utility function to clean JSON responses from LLMs that might include markdown formatting
  private static cleanJsonResponse(response: string): string {
    let cleanedResponse = response.trim();

    // Remove markdown code block indicators if present
    if (cleanedResponse.startsWith('```') || cleanedResponse.includes('```json')) {
      // Extract content between code block markers
      const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        cleanedResponse = codeBlockMatch[1].trim();
      } else {
        // If we can't extract from code blocks, just remove the markers
        cleanedResponse = cleanedResponse.replace(/```json|```/g, '').trim();
      }
    }

    return cleanedResponse;
  }
} 