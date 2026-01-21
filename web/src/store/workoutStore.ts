import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workout } from '../types';

interface WorkoutState {
  currentWorkout: Workout | null;
  workoutText: string;
  ftp: number | null;
  max_hr: number | null;
  lastSavedId: string | null;

  setWorkoutText: (text: string) => void;
  setCurrentWorkout: (workout: Workout | null) => void;
  setFtp: (ftp: number | null) => void;
  setMaxHr: (max_hr: number | null) => void;
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
      workoutText: 'warmup 10min\n5min 85-95% FTP "ramp up"\n3x 5min 95% FTP @90rpm\ncooldown 5min',
      ftp: null,
      max_hr: null,
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
