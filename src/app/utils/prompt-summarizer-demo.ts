/**
 * Demo script to test the prompt summarizer functionality
 * This can be used for manual testing and debugging
 */

import { ensurePromptLength, MAX_PROMPT_LENGTH } from './prompt-summarizer';

// Example long story prompt that exceeds the 4000 character limit
// This focuses on character consistency and scene details - the most important elements for story illustrations
const LONG_STORY_PROMPT_EXAMPLE = `
Create a vibrant children's book illustration showing Emma, a brave 7-year-old girl with shoulder-length curly red hair, bright green eyes, and freckles across her nose. She's wearing her favorite purple t-shirt with a rainbow on it, blue jeans with grass stains on the knees, and red sneakers with untied laces. Emma has a determined expression on her face with slightly furrowed brows and pursed lips, showing she's concentrating hard. She's crouched down next to a large oak tree in her backyard, carefully examining something on the ground with a magnifying glass in her right hand.

The scene takes place in Emma's backyard during a sunny afternoon. The large oak tree has thick, textured bark with deep grooves and a few low-hanging branches. Scattered around the base of the tree are fallen acorns, dried leaves, and small twigs. Emma is investigating mysterious tiny footprints in the soft dirt near the tree roots - these are small, paw-like prints that could belong to a fairy or magical creature.

The backyard setting includes Emma's family's wooden fence in the background, painted white but with some peeling paint showing the wood underneath. There's a small vegetable garden visible with tomato plants, lettuce, and sunflowers growing in neat rows. A red wagon sits nearby with Emma's detective kit inside - a notebook, colored pencils, a small flashlight, and a jar for collecting specimens.

The lighting is warm and golden, typical of a late afternoon in early autumn. Sunlight filters through the oak tree's leaves, creating dappled shadows on the ground around Emma. The leaves on the tree are just beginning to change colors, with some still green, others turning yellow and orange. A few leaves are gently falling, caught mid-air in the illustration.

Emma's body language shows intense curiosity and focus. She's balanced on the balls of her feet, one knee almost touching the ground, leaning forward to get a closer look at the mysterious prints. Her free hand is pressed against the tree trunk for balance. Her curly red hair catches the sunlight, and a few strands have escaped from behind her ears.

The overall mood should be one of mystery, adventure, and childhood wonder. This is Emma's first real mystery to solve, and she's taking it very seriously. The art style should be warm and inviting, with soft edges and a slightly painterly quality that appeals to children aged 5-8. Colors should be rich but not overwhelming, with the warm afternoon light tying everything together.

Additional details include: a small robin perched on a branch above Emma, watching her investigation with curious black eyes; a butterfly landing on one of the fallen leaves near the mysterious footprints; Emma's shoelaces trailing in the dirt; a small ant carrying a crumb across one of the footprints; and in the very background, barely visible through the kitchen window, Emma's mom washing dishes and occasionally glancing out to check on her daughter.

The composition should draw the viewer's eye to Emma first, then to the mysterious footprints she's examining, creating a sense of shared discovery and encouraging young readers to look closely at the details just like Emma is doing. Every element should support the story's theme of curiosity, investigation, and the magic that can be found in everyday places when you look closely enough.

The illustration should maintain consistency with previous pages showing Emma - same hair color and style, same clothing, same facial features, same personality traits visible in her expressions and body language. This is crucial for story continuity and character recognition throughout the book.
`.trim();

// Example short prompt that's under the limit
const SHORT_PROMPT_EXAMPLE = 'Emma, a 7-year-old girl with curly red hair, examining mysterious footprints in her backyard, children\'s book illustration style.';

/**
 * Demo function to test prompt summarization with story-focused content
 */
export async function testStoryPromptSummarizer() {
  console.log('=== Story-Focused Prompt Summarizer Demo ===\n');
  
  console.log(`MAX_PROMPT_LENGTH: ${MAX_PROMPT_LENGTH} characters\n`);
  
  // Test 1: Short prompt (should pass through unchanged)
  console.log('Test 1: Short Story Prompt');
  console.log(`Original length: ${SHORT_PROMPT_EXAMPLE.length} characters`);
  try {
    const result1 = await ensurePromptLength(SHORT_PROMPT_EXAMPLE);
    console.log(`Result length: ${result1.length} characters`);
    console.log(`Unchanged: ${result1 === SHORT_PROMPT_EXAMPLE}`);
    console.log(`Result: "${result1}"\n`);
  } catch (error) {
    console.error('Error with short prompt:', error, '\n');
  }
  
  // Test 2: Long story prompt (should be summarized while keeping character and scene details)
  console.log('Test 2: Long Story Prompt (Character & Scene Focused)');
  console.log(`Original length: ${LONG_STORY_PROMPT_EXAMPLE.length} characters`);
  console.log(`Over limit by: ${LONG_STORY_PROMPT_EXAMPLE.length - MAX_PROMPT_LENGTH} characters`);
  
  try {
    const result2 = await ensurePromptLength(LONG_STORY_PROMPT_EXAMPLE);
    console.log(`Result length: ${result2.length} characters`);
    console.log(`Summarized: ${result2 !== LONG_STORY_PROMPT_EXAMPLE}`);
    console.log(`Under limit: ${result2.length <= MAX_PROMPT_LENGTH}`);
    console.log(`Compression ratio: ${(LONG_STORY_PROMPT_EXAMPLE.length / result2.length).toFixed(2)}x`);
    
    // Check if key character details are preserved
    const hasCharacterName = result2.toLowerCase().includes('emma');
    const hasCharacterDetails = result2.toLowerCase().includes('red hair') || result2.toLowerCase().includes('curly');
    const hasSceneDetails = result2.toLowerCase().includes('backyard') || result2.toLowerCase().includes('oak tree');
    
    console.log(`\nCharacter Preservation Check:`);
    console.log(`- Character name preserved: ${hasCharacterName}`);
    console.log(`- Character details preserved: ${hasCharacterDetails}`);
    console.log(`- Scene details preserved: ${hasSceneDetails}`);
    
    console.log(`\nOriginal preview: "${LONG_STORY_PROMPT_EXAMPLE.substring(0, 200)}..."`);
    console.log(`Result preview: "${result2.substring(0, 200)}..."`);
    console.log(`\nFull summarized result:\n"${result2}"`);
  } catch (error) {
    console.error('Error with long story prompt:', error);
  }
  
  console.log('\n=== Demo Complete ===');
}

/**
 * Expected behavior after the improved summarization:
 * - Emma's character details (age, appearance, clothing) should be fully preserved
 * - Scene setting (backyard, oak tree, afternoon) should be maintained
 * - Key story elements (investigating footprints, magnifying glass) should remain
 * - Verbose descriptions and redundant adjectives should be removed
 * - Character consistency elements should be prioritized
 */

// Export the examples for use in other files
export { LONG_STORY_PROMPT_EXAMPLE, SHORT_PROMPT_EXAMPLE };

// Uncomment the line below to run the demo when this file is executed directly
// testStoryPromptSummarizer().catch(console.error);