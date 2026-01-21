import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workout, WorkoutStep } from '../types';

interface WorkoutState {
  currentWorkout: Workout | null;
  workoutText: string;
  ftp: number;
  max_hr: number;
  lastSavedId: string | null;

  setWorkoutText: (text: string) => void;
  setCurrentWorkout: (workout: Workout | null) => void;
  setFtp: (ftp: number) => void;
  setMaxHr: (max_hr: number) => void;
  setLastSavedId: (id: string | null) => void;
  resetWorkout: () => void;
  updateWorkoutName: (name: string) => void;
}

const defaultWorkout: Workout = {
  name: 'New Workout',
  steps: [],
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      currentWorkout: defaultWorkout,
      workoutText: 'warmup 10min\n3x 5min 95% FTP @90rpm\ncooldown 5min',
      ftp: 250,
      max_hr: 185,
      lastSavedId: null,

      setWorkoutText: (text) => set({ workoutText: text }),
      setCurrentWorkout: (workout) => set({ currentWorkout: workout }),
      setFtp: (ftp) => set({ ftp }),
      setMaxHr: (max_hr) => set({ max_hr }),
      setLastSavedId: (id) => set({ lastSavedId: id }),
      resetWorkout: () => set({
        currentWorkout: defaultWorkout,
        workoutText: '',
        lastSavedId: null
      }),
      updateWorkoutName: (name) => set((state) => ({
        currentWorkout: state.currentWorkout ? { ...state.currentWorkout, name } : null,
      })),
    }),
    {
      name: 'workout-storage',
    }
  )
);
