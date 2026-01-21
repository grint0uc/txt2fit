// Workout Step Types
export enum StepType {
  STEADY = 'STEADY',
  RAMP = 'RAMP',
  RANGE = 'RANGE',
  OPEN = 'OPEN',
  WARMUP = 'WARMUP',
  COOLDOWN = 'COOLDOWN',
  RECOVERY = 'RECOVERY',
  REPEAT = 'REPEAT',
}

// Target Types
export enum TargetType {
  POWER = 'POWER',
  HEART_RATE = 'HEART_RATE',
  CADENCE = 'CADENCE',
  OPEN = 'OPEN',
}

// Intensity Levels
export enum Intensity {
  WARMUP = 0,
  ACTIVE = 1,
  REST = 2,
  INTERVAL = 3,
}

// Workout Step
export interface WorkoutStep {
  step_type: StepType;
  duration_seconds: number;
  target_type: TargetType;
  power_low_pct?: number;
  power_high_pct?: number;
  heart_rate_low?: number;
  heart_rate_high?: number;
  cadence_low?: number;
  cadence_high?: number;
  name?: string;
  notes?: string;
  intensity?: Intensity;
}

// Complete Workout
export interface Workout {
  name: string;
  steps: WorkoutStep[];
  ftp?: number;
  max_hr?: number;
  created_at?: string;
  id?: string;
}

// Parse Result
export interface ParseResult {
  success: boolean;
  workout?: Workout;
  errors?: string[];
  warnings?: string[];
}

// Auth User
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

// Saved Workout in Database
export interface SavedWorkout {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  workout_text: string;
  ftp?: number;
  max_hr?: number;
  created_at: string;
  updated_at: string;
}

// UI State
export interface UIState {
  isAuthModalOpen: boolean;
  isSaveModalOpen: boolean;
  notification?: {
    type: 'success' | 'error' | 'info';
    message: string;
  };
}
