// This file is currently empty as all functions are commented out.
// When you uncomment the functions, make sure to add back the necessary imports.

// /**
//  * Creates a story and verifies that it was saved correctly
//  * @param storyData The story data to save
//  * @returns The created story ID or null if there was an error
//  */
// // export async function createAndVerifyStory(storyData: Story): Promise<string | null> {
// //   try {
// //     console.log('Creating and verifying story with data:', storyData);
// //     // Verify that the necessary choice pages exist
// //     const goodChoicePage = storyData.pages.find(page => page.pageType === PageType.GOOD_CHOICE);
// //     const badChoicePage = storyData.pages.find(page => page.pageType === PageType.BAD_CHOICE);
    
// //     if (!goodChoicePage || !badChoicePage) {
// //       throw new Error('Missing choice pages in story data');
// //     }
    
// //     if (!goodChoicePage.selectedImageUrl || !badChoicePage.selectedImageUrl) {
// //       throw new Error('Missing images for choice pages');
// //     }

// //     // Verify all required fields are present before submission
// //     if (!storyData.userId) throw new Error('Missing userId in story data');
// //     if (!storyData.kidId) throw new Error('Missing kidId in story data');
// //     if (!storyData.title) throw new Error('Missing title in story data');
// //     if (!storyData.problemDescription) throw new Error('Missing problemDescription in story data');
// //     if (!storyData.coverImage) throw new Error('Missing coverImage in story data');

// //     // Create the story using the proper Story model
// //     const createdStory = await StoryService.createStory(storyData);
    
// //     if (!createdStory?.id) {
// //       throw new Error('Failed to create story');
// //     }
    
// //     // Verify story was saved correctly
// //     const serverStory = await StoryService.getStoryById(createdStory.id);
    
// //     if (!serverStory) {
// //       throw new Error('Story verification failed');
// //     }
    
// //     // Verify cover image matches
// //     if (serverStory.coverImage !== createdStory.coverImage) {
// //       console.error('Cover image mismatch', {
// //         expected: createdStory.coverImage,
// //         actual: serverStory.coverImage
// //       });
      
// //       toast({
// //         title: "Warning",
// //         description: "Story created, but with image inconsistencies.",
// //         variant: "destructive"
// //       });
// //     }
    
// //     return createdStory.id;
// //   } catch (error) {
// //     console.error('Story creation failed:', error);
    
// //     toast({
// //       title: "Error",
// //       description: error instanceof Error ? error.message : "Failed to create story. Please try again.",
// //       variant: "destructive"
// //     });
    
// //     return null;
// //   }
// // }

// /**
//  * Prepares story data from the component state
//  */
// export function prepareStoryData(
//   currentUser: { uid: string },
//   kidDetails: { id: string },
//   selectedTitle: string,
//   problemDescription: string,
//   selectedCover: string,
//   pages: StoryPage[]
// ): Story | null {
//   // Verify required pages exist
//   const goodChoice = pages.find(choice => choice.pageType === PageType.GOOD_CHOICE);
//   const badChoice = pages.find(choice => choice.pageType === PageType.BAD_CHOICE);

//   if (!goodChoice || !badChoice) {
//     toast({
//       title: "Missing Choices",
//       description: "Please generate both good and bad choices",
//       variant: "destructive"
//     });
//     return null;
//   }

//   if (!goodChoice.selectedImageUrl || !badChoice.selectedImageUrl) {
//     toast({
//       title: "Missing Images",
//       description: "Please select images for both choices",
//       variant: "destructive"
//     });
//     return null;
//   }

//   return {
//     userId: currentUser.uid,
//     kidId: kidDetails.id,
//     title: selectedTitle,
//     problemDescription,
//     coverImage: selectedCover,
//     pages: pages,
//     id: '',  // Will be assigned by the server
//     status: StoryStatus.GENERATING,
//     createdAt: new Date(),
//     lastUpdated: new Date()
//   };
// }