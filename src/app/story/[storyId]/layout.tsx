import { Metadata } from 'next';
import { Story, PageType } from '@/models';

interface Props {
  params: Promise<{ storyId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storyId } = await params;
  
  try {
    // Make a direct server-side fetch to get the story
    // In production, NEXT_PUBLIC_BASE_URL should be set to 'https://choice-story.com'
    // In development, it will use localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.NODE_ENV === 'production' ? 'https://choice-story.com' : 'http://localhost:3000');
    const apiUrl = `${baseUrl}/api/story?storyId=${storyId}`;
    
    const response = await fetch(apiUrl, {
      cache: 'no-store', // Don't cache for fresh data
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch story');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.story) {
      // Fallback metadata if story not found
      const fallbackImageUrl = `${baseUrl}/illustrations/STORY_COVER.svg`;
      return {
        title: 'Choice Story',
        description: 'An interactive story adventure',
        openGraph: {
          title: 'Choice Story',
          description: 'An interactive story adventure where your choices matter',
          images: [
            {
              url: fallbackImageUrl,
              width: 1200,
              height: 630,
              alt: 'Story cover',
            },
          ],
          type: 'website',
          siteName: 'Choice Story',
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Choice Story',
          description: 'An interactive story adventure where your choices matter',
          images: [fallbackImageUrl],
        },
      };
    }

    const story: Story = data.story;
    
    // Get the cover page image - check both pageType and pageNum
    const coverPage = story.pages?.find(page => 
      page.pageType === PageType.COVER || page.pageNum === 0
    );
    const coverImageUrl = coverPage?.selectedImageUrl || '/illustrations/STORY_COVER.svg';
    
    // Make sure the image URL is absolute for Open Graph
    // Firebase Storage URLs are already absolute, so don't modify them
    const absoluteImageUrl = coverImageUrl.startsWith('http') 
      ? coverImageUrl 
      : `${baseUrl}${coverImageUrl.startsWith('/') ? '' : '/'}${coverImageUrl}`;

    return {
      title: story.title || 'Choice Story',
      description: story.problemDescription || 'An interactive story adventure where your choices matter',
      openGraph: {
        title: story.title || 'Choice Story',
        description: story.problemDescription || 'An interactive story adventure where your choices matter',
        images: [
          {
            url: absoluteImageUrl,
            width: 1200,
            height: 630,
            alt: story.title || 'Story cover',
          },
        ],
        type: 'website',
        siteName: 'Choice Story',
        url: `${baseUrl}/story/${storyId}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: story.title || 'Choice Story',
        description: story.problemDescription || 'An interactive story adventure where your choices matter',
        images: [absoluteImageUrl],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    
    // Fallback metadata with proper image format
    const fallbackImageUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                            (process.env.NODE_ENV === 'production' ? 'https://choice-story.com' : 'http://localhost:3000') +
                            '/illustrations/STORY_COVER.svg';
    
    return {
      title: 'Choice Story',
      description: 'An interactive story adventure',
      openGraph: {
        title: 'Choice Story',
        description: 'An interactive story adventure where your choices matter',
        images: [
          {
            url: fallbackImageUrl,
            width: 1200,
            height: 630,
            alt: 'Story cover',
          },
        ],
        type: 'website',
        siteName: 'Choice Story',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Choice Story',
        description: 'An interactive story adventure where your choices matter',
        images: [fallbackImageUrl],
      },
    };
  }
}

export default function ReadLayout({ children }: Props) {
  return <>{children}</>;
}

