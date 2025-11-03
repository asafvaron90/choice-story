import Replicate from 'replicate';
import {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  StoryPageGenerationModel,
  ImageGenerationResponse,
  AvatarGenerationModel,
  StoryChoiceGenerationModel,
  BaseImageGenerationModel
  /* eslint-enable @typescript-eslint/no-unused-vars */
} from '@/models';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PromptTemplates } from './prompt-templates';
/* eslint-enable @typescript-eslint/no-unused-vars */

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

// export interface PixarAvatarResponse {
//   imageUrls: string[];
//   error?: string;
// }

// export interface PixarStoryResponse {
//   imageUrl: string;
//   error?: string;
// }

// interface PredictionResponse {
//   id: string;
//   status: 'starting' | 'processing' | 'succeeded' | 'failed';
//   output: string | string[] | null;
//   error: string | null;
// }

export interface ImageRequirementsCheckResponse {
  isValid: boolean;
  issues: string[];
  validations: {
    facePosition: {
      isValid: boolean;
      details: string;
      confidence: number;
    };
    singleSubject: {
      isValid: boolean;
      details: string;
      confidence: number;
    };
    faceVisibility: {
      isValid: boolean;
      details: string;
      confidence: number;
    };
    imageQuality: {
      isValid: boolean;
      details: string;
      confidence: number;
    };
  };
  recommendations: string[];
}

export class ReplicateApiService {
  private readonly REPLICATE_API_URL = process.env.REPLICATE_API_URL || 'https://api.replicate.com/v1/predictions';
  private static readonly FLUX_MODEL_VERSION = "black-forest-labs/flux-schnell" as `${string}/${string}`;
  private static readonly AVATAR_MODEL_VERSION = "tencentarc/photomaker-style:467d062309da518648ba89d226490e02b8ed09b5abc15026e54e31c5a8cd0769";
  private static readonly PHOTO_MODEL_VERSION = "tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4"
  private static readonly LLAVA_MODEL_VERSION = "yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb";
  private static readonly SDXL_MODEL_VERSION = "stability-ai/sdxl:c221b2b8ef527988fb59bf24a8b97c4561f1c671f73bd389f866bfb27c061316";

  /**
   * Converts an image URL to base64 format
   * @param imageUrl URL of the image to convert
   * @returns Promise resolving to a base64 string
   */
  private async convertImageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      // If it's already a base64 string, return it directly
      if (imageUrl.startsWith('data:')) {
        console.log('Image is already in base64 format');
        return imageUrl;
      }

      console.log('Converting image URL to base64:', imageUrl.substring(0, 50) + '...');
      
      // Fetch the image
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      // Get the content type
      const contentType = response.headers.get('content-type') || 'image/png';
      
      // Convert to array buffer and then to base64
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      // Return as data URL
      const dataUrl = `data:${contentType};base64,${base64}`;
      console.log('Converted to base64 successfully');
      
      return dataUrl;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      // Return original URL if conversion fails
      return imageUrl;
    }
  }

  /**
   * Generic function to generate images using Replicate API
   */
  private async generateImage(
    modelVersion: `${string}/${string}` | `${string}/${string}:${string}`,
    input: Record<string, unknown>
  ): Promise<ImageGenerationResponse> {
    try {
      console.log('Generating image with parameters:', JSON.stringify(input, null, 2));
      
      // Ensure input_image is set correctly
      if (!input.input_image && input.image_url) {
        input.input_image = input.image_url;
        delete input.image_url; // Remove the old property
      }

      const output = await replicate.run(modelVersion, { input });

      if (Array.isArray(output) && output.length > 0) {
        // Ensure all URLs are strings
        const imageUrls = output.map(url => String(url));
        return {
          success: true,
          imageUrls
        };
      }

      throw new Error("Failed to generate image");
    } catch (error) {
      console.error("Error generating image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate image"
      };
    }
  }

  /**
   * Creates a Pixar-style avatar
   */
  // async createAvatar(model: AvatarGenerationModel): Promise<ImageGenerationResponse> {
  //   try {


  //     console.log("createAvatar prompt", PromptTemplates.AVATAR_BASE_PROMPT(model.age, model.gender, model.imageAnalysis));
  //     const input = {
  //       /** The main prompt that guides the image generation, incorporating age, gender, and image analysis */
  //       prompt: PromptTemplates.AVATAR_BASE_PROMPT(model.age, model.gender, model.imageAnalysis),
  //       /** Number of denoising steps. Higher values (20-100) give higher quality but take longer. Default: 20 */
  //       num_steps: model.num_steps || 100,
  //       /** URL of the source image to be transformed */
  //       input_image: model.image_url,
  //       /** Name of the style to apply. Default: "(No style)" */
  //       style_name: model.style_name || "(No style)",
  //       /** Number of images to generate in a single request. Default: 4 */
  //       num_outputs: model.num_outputs || 4,
  //       /** Controls how closely the image follows the prompt. Higher values (5-20) give stronger adherence. Default: 5 */
  //       guidance_scale: model.guidance_scale || 5,
  //       /** Prompt specifying what to avoid in the generation. Uses template default if not provided */
  //       negative_prompt: model.negative_prompt || PromptTemplates.AVATAR_NEGATIVE_PROMPT,
  //       /** Strength of the style application (15-50). Higher values create more stylized results. Default: 35 */
  //       style_strength_ratio: model.style_strength_ratio || 35
  //     };

  //     console.log('\n=== Avatar Generation Analysis ===');
  //     console.log('Age:', model.age);
  //     console.log('Gender:', model.gender);
  //     console.log('Image Analysis:', model.imageAnalysis);
  //     console.log('\n=== Generation Parameters ===');
  //     console.log('Model:', ReplicateApiService.AVATAR_MODEL_VERSION);
  //     console.log('Final Parameters:', JSON.stringify(input, null, 2));
  //     console.log('================================\n');

  //     return this.generateImage(ReplicateApiService.AVATAR_MODEL_VERSION, input);
  //   } catch (error) {
  //     console.error("Error in createAvatar:", error);
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Failed to generate avatar"
  //     };
  //   }
  // }

  /**
   * Creates a Pixar-style story page
   */
  // async createStoryPage(
  //   model: StoryPageGenerationModel & {
  //     isCover?: boolean;
  //   }
  // ): Promise<ImageGenerationResponse> {
  //   try {
  //     const input = {
  //       prompt: model.isCover
  //         ? await PromptTemplates.STORY_COVER_PROMPT(
  //             model.age,
  //             model.gender,
  //             model.title,
  //             model.problem
  //           )
  //         : await PromptTemplates.STORY_PAGE_PROMPT(model.prompt || ""),
  //       negative_prompt: model.isCover
  //         ? PromptTemplates.STORY_COVER_NEGATIVE_PROMPT
  //         : PromptTemplates.STORY_COVER_NEGATIVE_PROMPT,
  //       num_steps: model.isCover ? 100 : 50,
  //       guidance_scale: model.isCover ? 7.5 : 5,
  //       style_strength_ratio: model.isCover ? 35 : 25,
  //       seed: Math.floor(Math.random() * 1000000),
  //       scheduler: 'K_EULER',
  //       num_outputs: 2,
  //       style_preset: 'pixar',
  //       input_image: model.image_url
  //     };

  //     console.log('Final Parameters:', JSON.stringify(input, null, 2));
  //     return this.generateImage(ReplicateApiService.AVATAR_MODEL_VERSION, input);
  //   } catch (error: any) {
  //     console.error("Error in createStoryPage:", error);
  //     return { success: false, imageUrls: [], error: error.toString() };
  //   }
  // }

  /**
   * Creates images for story choices (good and bad outcomes)
   */
  // async createStoryChoices(model: StoryChoiceGenerationModel): Promise<ImageGenerationResponse> {
  //   try {

  //     const avatarPrompt = PromptTemplates.AVATAR_BASE_PROMPT(model.age, model.gender, model.imageAnalysis);

  //     // Generate prompt using the template
  //     const prompt = await PromptTemplates.STORY_CHOICES_PROMPT(
  //       model.outcome,
  //       model.choiceTitle,
  //       model.choiceDescription,
  //       model.age,
  //       model.gender,
  //       model.problem
  //     );

  //     console.log(`\n=== ${model.outcome.toUpperCase()} Choice Generation Analysis ===`);
  //     console.log('Age:', model.age);
  //     console.log('Gender:', model.gender);
  //     console.log('Problem:', model.problem);
  //     console.log('Outcome:', model.outcome);
  //     console.log('Choice Title:', model.choiceTitle);
  //     console.log('Choice Description:', model.choiceDescription);
  //     console.log('\n=== Generation Parameters ===');
  //     console.log('Prompt:', prompt);
  //     console.log('================================\n');

  //     const input = {
  //       prompt,
  //       negative_prompt: PromptTemplates.STORY_CHOICES_NEGATIVE_PROMPT,
  //       num_steps: 80,
  //       guidance_scale: 7.5,
  //       num_outputs: 2,
  //       style_preset: 'pixar',
  //       input_image: model.image_url,
  //       style_strength_ratio: 35,
  //     };

  //     return this.generateImage(ReplicateApiService.AVATAR_MODEL_VERSION, input);
  //   } catch (error) {
  //     console.error("Error in createStoryChoices:", error);
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Failed to generate story choices"
  //     };
  //   }
  // }

  // private async pollForResult(predictionId: string, maxAttempts = 60): Promise<PredictionResponse> {
  //   for (let i = 0; i < maxAttempts; i++) {
  //     const response = await fetch(`${this.REPLICATE_API_URL}/${predictionId}`, {
  //       headers: {
  //         'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
  //       },
  //     });

  //     if (!response.ok) {
  //       throw new Error(`Failed to poll for result: ${await response.text()}`);
  //     }

  //     const result = await response.json();

  //     if (result.status === 'succeeded' || result.status === 'failed') {
  //       return result;
  //     }

  //     // Wait for 3 seconds before next attempt (increased from 2)
  //     await new Promise(resolve => setTimeout(resolve, 3000));
  //   }

  //   throw new Error('Timeout waiting for avatar generation. Please try again.');
  // }

  /**
   * Analyzes an image to extract descriptive information
   */
  async analyzeImage(imageUrl: string): Promise<string> {
    try {
      console.log('Analyzing image:', imageUrl.substring(0, 50) + '...');
      
      // First convert the image to base64 if it's not already
      const base64Image = await this.convertImageUrlToBase64(imageUrl);
      
      const input = {
        image: base64Image,
        prompt: "Describe this child in detail for creating a Pixar-style 3D character. Include:\n- Age range\n- Gender\n- Hair color, length, and style\n- Eye color and shape\n- Skin tone\n- Facial features (nose, mouth, ears, etc.)\n- Apparent cultural background if obvious\n- Any distinguishing features (freckles, glasses, etc.)\n- Expression and perceived personality\n\nBe objective, descriptive, and focus only on physical appearance for character design purposes.",
        temperature: 0.2
      };
      
      console.log('Sending analysis request with parameters:', JSON.stringify({
        ...input,
        image: '[BASE64_IMAGE]' // Log placeholder instead of actual base64
      }, null, 2));
      
      const output = await replicate.run(
        ReplicateApiService.LLAVA_MODEL_VERSION,
        { input }
      );
      
      console.log('Analysis result:', output);
      
      if (typeof output === 'string') {
        return output;
      } else if (Array.isArray(output) && output.length > 0) {
        return output.join(' ');
      }
      
      throw new Error('Invalid response format from image analysis');
    } catch (error) {
      console.error('Error analyzing image:', error);
      return 'Failed to analyze image. Please try again or upload a clearer photo.';
    }
  }

  /**
   * Checks if an uploaded image meets requirements for avatar generation
   */
  async analyzeImageRequirements(imageUrl: string): Promise<ImageRequirementsCheckResponse> {
    try {
      console.log('Analyzing image requirements:', imageUrl.substring(0, 50) + '...');
      
      // First convert the image to base64 if it's not already
      const base64Image = await this.convertImageUrlToBase64(imageUrl);
      
      const input = {
        image: base64Image,
        prompt: `You are an expert in assessing photos for AI avatar generation. Analyze this image and determine if it meets these requirements:

1. Face position: The face should be centered and take up a reasonable portion of the frame
2. Single subject: Only one person's face should be clearly visible
3. Face visibility: The face should be clearly visible, not obscured
4. Image quality: The image should be clear, well-lit, and high resolution

For each requirement, provide:
- Whether it passes (true/false)
- Detailed explanation
- Confidence score (0-100)

Format your response as valid JSON:
{
  "isValid": boolean,
  "issues": [string],
  "validations": {
    "facePosition": {"isValid": boolean, "details": string, "confidence": number},
    "singleSubject": {"isValid": boolean, "details": string, "confidence": number},
    "faceVisibility": {"isValid": boolean, "details": string, "confidence": number},
    "imageQuality": {"isValid": boolean, "details": string, "confidence": number}
  },
  "recommendations": [string]
}`,
        temperature: 0.1
      };
      
      console.log('Sending requirements analysis with parameters:', JSON.stringify({
        ...input,
        image: '[BASE64_IMAGE]' // Log placeholder instead of actual base64
      }, null, 2));
      
      const output = await replicate.run(
        ReplicateApiService.LLAVA_MODEL_VERSION,
        { input }
      ) as string | string[];
      
      console.log('Requirements analysis result:', output);
      
      // Process the output - it might be a string containing JSON
      if (typeof output === 'string') {
        try {
          // Find the JSON part of the output
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            const result = JSON.parse(jsonStr) as ImageRequirementsCheckResponse;
            return result;
          }
        } catch (parseError) {
          console.error('Error parsing JSON from output:', parseError);
        }
      } else if (Array.isArray(output) && output.length > 0) {
        // If output is an array, join it into a string and try to extract JSON
        const outputStr = output.join('');
        try {
          const jsonMatch = (outputStr as string).match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            const result = JSON.parse(jsonStr) as ImageRequirementsCheckResponse;
            return result;
          }
        } catch (parseError) {
          console.error('Error parsing JSON from array output:', parseError);
        }
      }
      
      // Fallback to a default response if parsing fails
      return {
        isValid: false,
        issues: ['Failed to analyze image requirements properly'],
        validations: {
          facePosition: { isValid: false, details: 'Analysis failed', confidence: 0 },
          singleSubject: { isValid: false, details: 'Analysis failed', confidence: 0 },
          faceVisibility: { isValid: false, details: 'Analysis failed', confidence: 0 },
          imageQuality: { isValid: false, details: 'Analysis failed', confidence: 0 }
        },
        recommendations: ['Please try uploading a different photo with a clear, well-lit face that is centered in the frame.']
      };
    } catch (error) {
      console.error('Error analyzing image requirements:', error);
      return {
        isValid: false,
        issues: ['Technical error during image analysis'],
        validations: {
          facePosition: { isValid: false, details: 'Analysis error', confidence: 0 },
          singleSubject: { isValid: false, details: 'Analysis error', confidence: 0 },
          faceVisibility: { isValid: false, details: 'Analysis error', confidence: 0 },
          imageQuality: { isValid: false, details: 'Analysis error', confidence: 0 }
        },
        recommendations: ['Please try again with a different image. Make sure the image shows a clear, centered face.']
      };
    }
  }

  /**
   * Generates images based on a text prompt
   */
  async generateImagesFromPrompt(params: {
    prompt: string;
    num_outputs?: number;
    num_steps?: number;
    guidance_scale?: number;
    negative_prompt?: string;
    referenceImageUrl?: string;
  }): Promise<ImageGenerationResponse> {
    try {
      const { 
        prompt, 
        num_outputs = 1, 
        num_steps = 50, 
        guidance_scale = 7.5, 
        negative_prompt = "", 
        referenceImageUrl 
      } = params;

      const input: Record<string, unknown> = {
        prompt,
        negative_prompt,
        num_outputs,
        num_steps,
        guidance_scale
      };

      // If there's a reference image, include it
      if (referenceImageUrl) {
        const base64Image = await this.convertImageUrlToBase64(referenceImageUrl);
        input.input_image = base64Image;
        input.style_name = "(No style)";
        input.style_strength_ratio = 20;
      }

      console.log('Generating images with prompt:', prompt);
      console.log('Parameters:', JSON.stringify({
        ...input,
        input_image: referenceImageUrl ? '[REFERENCE_IMAGE]' : undefined
      }, null, 2));

      // Decide which model to use based on whether we have a reference image
      const modelVersion = referenceImageUrl 
        ? ReplicateApiService.PHOTO_MODEL_VERSION
        : ReplicateApiService.SDXL_MODEL_VERSION;

      return this.generateImage(modelVersion, input);
    } catch (error) {
      console.error('Error generating images from prompt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate images'
      };
    }
  }
} 