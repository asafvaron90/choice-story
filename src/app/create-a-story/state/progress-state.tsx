import { create } from "zustand";
// import { createJSONStorage, persist } from "zustand/middleware";

interface CreateStoryProgress {
  step: number;
  steps: string[];
  next: () => void;
  back: () => void;
  selectedKidId: string | null;
  setSelectedKidId: (kidId: string | null) => void;
  reset: () => void;
}

const useCreateStoryProgressState = create<CreateStoryProgress>()(
  // persist(
  (set, _get) => ({
    step: 0,
    steps: [
      "Problem Description",
      "Select Title",
      "Generate Cover",
      "Generate Choices",
    ],
    selectedKidId: null,
    setSelectedKidId: (kidId: string | null) => {
      set({ 
        selectedKidId: kidId,
        step: 0 // Start at problem description
      });
    },
    next: () =>
      set((state: { step: number; steps: string[] }) => ({
        step:
          state.step >= 0 && state.step < state.steps.length
            ? state.step + 1
            : state.step,
      })),
    back: () =>
      set((state: { step: number; steps: string[] }) => ({
        step:
          state.step > 0 && state.step <= state.steps.length
            ? state.step - 1
            : state.step,
      })),
    reset: () => set({
      step: 0,
      selectedKidId: null
    }),
  }),
  //   {
  //     name: "step-storage", // name of the item in the storage (must be unique)
  //     storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
  //   },
  // )
);

export default useCreateStoryProgressState;
