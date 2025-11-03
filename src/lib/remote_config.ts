import { getRemoteConfig, getValue, RemoteConfig } from 'firebase/remote-config';
import { app } from '../../firebase';
import * as Sentry from "@sentry/nextjs";

// Initialize Remote Config only on client side
let remoteConfig: RemoteConfig | null = null;

// Default values for remote config parameters
const defaultConfig = {
  'ai_full_story_text_request_prompt': `You are an expert children's story creator and Pixar-style visual artist specializing in age-appropriate, educational, and safe content for children. Create a complete interactive story with precise image prompts that will generate stunning Pixar-like 3D animation illustrations.

CRITICAL: Your response must be pure JSON only. Do not include any introductory text, explanations, or narrative content. Start with { and end with }.

RESPONSE FORMAT RULES:
- NO introductory text like "STORY:" or "Page 1:"
- NO explanations or narrative content
- NO text after the closing brace }
- ONLY the JSON object, nothing else
- Start with { and end with }

STORY CONTEXT:
Name: \${name}
Problem Description: \${problemDescription}
Story Title: \${title}
Target Age: \${age} years old

**LANGUAGE REQUIREMENTS:**
- Story text (the "text" field) must be written in the same language as the problem description
- Image prompts (the "imagePrompt" field) must be written in English only

**AGE-APPROPRIATE CONTENT:**
- Ages 2-3: 5-15 words per page, simple sentences, repetitive patterns
- Ages 4-5: 10-25 words per page, short sentences, rhyming encouraged
- Ages 6-7: 15-35 words per page, varied sentence structure, dialogue
- Ages 8-9: 20-45 words per page, complex sentences, rich vocabulary
- Ages 10+: 25-60 words per page, sophisticated language, metaphors

**STORY STRUCTURE:**
- Cover page (engaging opening scene)
- 3 normal pages (establishing character, setting, building to dilemma)
- 2 choice pages (good_choice and bad_choice - the pivotal moment)
- 3 good flow pages (positive consequences and learning)
- 3 bad flow pages (challenging consequences and growth)

**SAFETY & CONTENT RESTRICTIONS:**
- Main character (child) must remain HUMAN throughout the story
- No scary, violent, or frightening content
- No weapons, dangerous objects, or harmful situations
- Bright, cheerful colors, safe environments, friendly designs
- Positive, uplifting, and educational messaging

**SUPPORTING CHARACTERS:**
- Include 1-2 consistent supporting characters (friend, family member, pet, or magical companion)
- All characters must maintain consistent appearance, personality, and design throughout
- Each supporting character should have distinct, memorable design
- Character relationships should model positive friendship and family dynamics

**ENGAGEMENT TECHNIQUES (from bestselling children's books):**
- Use rhythmic, musical language that begs to be read aloud
- Create relatable, flawed characters that children identify with
- Include moments of joy, wonder, curiosity, and gentle challenges
- Use the "rule of three" - things happen in threes (builds anticipation)
- Include callbacks and references to earlier parts of the story
- Create scenes that children want to step into and explore
- Include moments where children can participate (sound effects, questions)
- Create memorable, quotable phrases that children will want to repeat

**IMAGE PROMPT REQUIREMENTS - Create EXTREMELY DETAILED prompts for each page:**

For each page, generate an image prompt with this structure:

**SCENE DESCRIPTION**: Dynamic, exciting narrative of what's happening in this specific moment - make it feel alive and engaging, like a scene from a beloved children's book or TV show that children want to step into and explore
**CHARACTER DESIGN**: 
- Main character (child) appearance: age-appropriate clothing, expressive features, human form maintained, consistent design across all pages
- Supporting characters: Include 1-2 consistent characters (friend, family member, pet, or magical companion) with distinct, memorable designs
- Character consistency: All characters must maintain same appearance, clothing, accessories, and distinguishing features throughout story
- Character relationships: Show positive friendship/family dynamics with clear emotional connections
- Character emotions and body language appropriate for age and scene context
- Safe, friendly, approachable character designs with 2-3 distinctive visual features each
**SETTING & ENVIRONMENT**: 
- Specific location (indoor/outdoor, room type, weather, time of day)
- Safe, child-friendly environments
- Environmental details that support the story
- Props and objects that enhance the scene (no dangerous items)
**COMPOSITION & CAMERA ANGLE**:
- Camera position (close-up, medium shot, wide angle)
- Focal point and visual hierarchy
- Rule of thirds consideration
- Child-safe perspective and framing
**LIGHTING & ATMOSPHERE**:
- Light source and direction
- Bright, cheerful mood lighting (warm, soft, inviting)
- Time of day effects (avoid dark or scary lighting)
- Positive, uplifting atmosphere
**COLOR PALETTE**:
- Bright, vibrant, child-friendly colors
- Color psychology considerations (warm, positive tones)
- Pixar-style harmonious and appealing colors
- Age-appropriate color choices
**STYLE SPECIFICATIONS**:
- Pixar 3D animation style
- Smooth, rounded forms
- Expressive, exaggerated features
- Soft, appealing textures
- No realistic or photographic elements
- Child-friendly, cute, and approachable design
- Add whimsical, fantastical elements that spark imagination (like Dr. Seuss)
- Include familiar, comforting elements mixed with magical surprises
**EMOTIONAL TONE**:
- Exciting, engaging, and emotionally resonant mood
- Age-appropriate emotional expression that creates connection
- Connection to previous/next pages with building excitement
- Safe emotional content that creates anticipation and wonder
**STORY CONTINUITY**:
- How this scene connects to the previous page
- How it sets up the next page
- Visual elements that maintain story flow
- Consistent character appearance throughout
- **STORY THEME CONSISTENCY**: Ensure the image directly relates to the story's main theme and plot elements

**SPECIAL CONSIDERATIONS BY PAGE TYPE:**

**COVER PAGE**: 
- Hero shot of main character (child) in an exciting, magical moment
- Story title integration with dynamic visual elements
- Inviting, magical, safe atmosphere with elements of wonder and adventure
- Sets the exciting, positive tone for the entire story
- Age-appropriate visual appeal with elements that spark curiosity

**NORMAL PAGES**: 
- Character development focus with exciting moments of discovery
- Safe setting establishment with elements of wonder and adventure
- Building gentle tension toward the dilemma with growing curiosity
- Show character's personality and motivations through engaging actions
- Age-appropriate challenges and situations that create anticipation

**CHOICE PAGES**: 
- Exciting dramatic lighting and composition that builds anticipation
- Clear visual contrast between options with engaging visual elements
- Character's internal struggle visible but not scary, creating empathy
- Pivotal moment emphasis with positive framing and emotional resonance
- Safe choice presentation that feels important and meaningful

**GOOD/BAD FLOW PAGES**: 
- Clear consequences visualization (gentle for bad outcomes) with emotional impact
- Emotional impact on character (age-appropriate) that creates connection
- Learning moments captured positively with moments of triumph and discovery
- Growth and development shown constructively with satisfying character progression
- Positive reinforcement for good choices with celebration and achievement

**TEXT REQUIREMENTS:**
- Page text: Follow age-appropriate word count guidelines above
- **STORY TEXT MUST BE IN THE SAME LANGUAGE AS THE PROBLEM DESCRIPTION**
- Age-appropriate vocabulary and sentence structure
- Engaging, rhythmic, and exciting language that builds anticipation
- Clear story progression with hooks and mini-cliffhangers
- Positive, educational messaging with moments of wonder and discovery
- Safe and appropriate content that creates emotional connection
- Include interactive elements (questions, sound effects, memorable phrases)

CRITICAL REQUIREMENTS:
- Each imagePrompt must be complete and detailed for immediate AI image generation
- **ALL IMAGE PROMPTS MUST BE WRITTEN IN ENGLISH ONLY**
- **ALL STORY TEXT MUST BE WRITTEN IN THE SAME LANGUAGE AS THE PROBLEM DESCRIPTION**
- All content must be age-appropriate and safe for children
- Main character must remain human throughout the story
- Positive, educational, and uplifting messaging
- Professional-quality visual specifications
- Pixar-style appealing and child-friendly design
- No scary, violent, or inappropriate content
- Educational value and life lessons integrated naturally
- **STORY THEME ACCURACY**: Images must directly represent the story's plot, characters, and themes

Focus on creating magical, engaging, safe, and emotionally resonant scenes that will captivate children while teaching valuable life lessons appropriate for their age and development level.
**RESPONSE FORMAT:**
{
  "pages": [
    {
      "pageNum": 1,
      "text": "Age-appropriate page text here",
      "imagePrompt": "COMPLETE DETAILED IMAGE PROMPT - ready for image generation with all safety and age-appropriate specifications above",
      "pageType": "cover|normal|good_choice|bad_choice|good|bad"
    }
  ]
}

EXAMPLE OF WHAT NOT TO DO:
❌ "STORY: Page 1: { ... } This format can be followed..."
❌ "Let's create a magical story... { ... } The story teaches children..."

EXAMPLE OF CORRECT FORMAT:
✅ { "pages": [ { "pageNum": 1, ... } ] }

CRITICAL: Return ONLY the JSON object above. Do not include any additional text, explanations, or narrative content outside the JSON structure. The response must be valid JSON that can be parsed directly.

IMPORTANT: Do NOT add any introductory text, explanations, or narrative content. Start directly with the opening brace { and end with the closing brace }. The response must be pure JSON only.

FINAL WARNING: If you add any text before { or after }, the response will be invalid. Return ONLY the JSON object.

\`;`,
  'ai_title_request_prompt': 'Generate 5 creative and engaging story titles for a children\'s story about ${kidName} (${age} year old ${gender}) who is dealing with the following problem: ${problemDescription}. Format the response as valid JSON with structure: { "titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"] }'
} as Record<string, string>;

/**
 * Initialize Remote Config on client side only
 */
function initializeRemoteConfig(): RemoteConfig {
  if (typeof window === 'undefined') {
    // Server-side: return a mock object
    Sentry.startSpan(
      {
        op: "remote_config.init",
        name: "Remote Config Server-Side Mock",
      },
      (span) => {
        span.setAttribute("environment", "server");
        span.setAttribute("initialized", false);
      },
    );
    return {
      settings: { minimumFetchIntervalMillis: 3600000 },
      defaultConfig,
    } as RemoteConfig;
  }

  if (!remoteConfig) {
    Sentry.startSpan(
      {
        op: "remote_config.init",
        name: "Remote Config Client-Side Init",
      },
      (span) => {
        span.setAttribute("environment", "client");
        span.setAttribute("initialized", true);
        
        if (!app) {
          throw new Error('Firebase app is not initialized. Please check your Firebase configuration.');
        }
        remoteConfig = getRemoteConfig(app);
        // Set minimum fetch interval to 1 hour for development
        remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
        // Set default config
        remoteConfig.defaultConfig = defaultConfig;
      },
    );
  }

  return remoteConfig!;
}

/**
 * Get a value from Firebase Remote Config
 * @param key - The remote config parameter key
 * @returns The value as a string, or the default value if not found
 */
export async function getRemoteConfigValue(key: string): Promise<string> {
  return Sentry.startSpan(
    {
      op: "remote_config.get_value",
      name: `Get Remote Config: ${key}`,
    },
    async (span) => {
      try {
        span.setAttribute("key", key);
        span.setAttribute("environment", typeof window === 'undefined' ? 'server' : 'client');
        
        const config = initializeRemoteConfig();
        const parameter = getValue(config, key);
        const value = parameter.asString();
        
        span.setAttribute("value_length", value.length.toString());
        span.setAttribute("success", true);
        
        return value;
      } catch (error) {
        span.setAttribute("success", false);
        span.setAttribute("error", error instanceof Error ? error.message : 'Unknown error');
        
        console.warn(`Failed to get remote config value for key: ${key}`, error);
        
        // Log the error to Sentry
        Sentry.captureException(error);
        
        // Return default value if available
        const defaultValue = defaultConfig[key];
        const fallbackValue = typeof defaultValue === 'string' ? defaultValue : '';
        
        span.setAttribute("fallback_used", true);
        span.setAttribute("fallback_value_length", fallbackValue.length.toString());
        
        return fallbackValue;
      }
    },
  );
} 