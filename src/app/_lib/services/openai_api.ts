import OpenAI from 'openai';
import fetch from 'node-fetch';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* eslint-disable @typescript-eslint/no-unused-vars */
const PIXAR_CHARACTER_STYLE = `
Create a heartwarming Pixar-style 3D animated character portrait with these specific qualities:
- Maintain the subject's key facial features, expressions, and personality
- Use Pixar's signature eye style with enhanced reflections and depth
- Add subtle subsurface scattering for skin texture
- Implement soft rim lighting and 3-point lighting setup
- Include micro-expressions and subtle facial details
- Ensure the character has appealing, slightly exaggerated features
- Add subtle freckles or skin details for realism
- Create hair with volume and individual strand definition
- Use warm color grading typical of Pixar films
- Maintain child-friendly appeal while keeping unique characteristics
The final result should look like it's straight from a high-budget Pixar film, ready for a children's storybook.
`.trim();

const PIXAR_SCENE_STYLE = `
Create a cinematic Pixar-style storybook illustration with these elements:
- Use depth of field and atmospheric perspective
- Implement dynamic composition following the rule of thirds
- Add volumetric lighting and god rays where appropriate
- Include subtle environmental storytelling in background details
- Use rich, saturated colors with Pixar's signature color grading
- Add texture overlays for a storybook feel
- Include subtle particle effects (dust, sparkles) for magic
- Ensure foreground, midground, and background separation
- Add subtle vignetting for focus
- Include decorative storybook border elements
The scene should feel magical and immersive, perfect for a premium children's book.
`.trim();
/* eslint-enable @typescript-eslint/no-unused-vars */

export async function generateImageWithOpenAI(prompt: string, inputImageUrl?: string) {
  try {
    if (inputImageUrl) {
      // Fetch the image from the URL
      const response = await fetch(inputImageUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      // Resize and compress image more aggressively
      const resizedImageBuffer = await sharp(Buffer.from(arrayBuffer))
        .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png({ 
          quality: 80,
          compressionLevel: 9,
          palette: true // Use palette-based PNG for smaller file size
        })
        .toBuffer();

      // Create a Blob from the buffer
      const blob = new Blob([resizedImageBuffer], { type: 'image/png' });
      
      // Convert Blob to File
      const file = new File([blob], 'image.png', { type: 'image/png' });

      const response2 = await openai.images.createVariation({
        image: file,
        n: 4,
        size: "1024x1024",
        model: "dall-e-3",
      });

      if (!response2.data?.[0]?.url) {
        throw new Error('Failed to get image URL from OpenAI response');
      }
      return response2.data[0].url;
    } else {
      
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 4,
        size: "1024x1024",
        quality: "hd",
        style: "vivid",
      });

      if (!response.data?.[0]?.url) {
        throw new Error('Failed to get image URL from OpenAI response');
      }
      return response.data[0].url;
    }
  } catch (error) {
    console.error('Error generating image with OpenAI:', error);
    throw error;
  }
} 