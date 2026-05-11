// Workout Step Types
export enum StepType {
  STEADY = 'STEADY',
  RAMP = 'RAMP',
  WARMUP = 'WARMUP',
  COOLDOWN = 'COOLDOWN',
  RECOVERY = 'RECOVERY',
  REPEAT = 'REPEAT',
}

// Target Types
export enum TargetType {
  POWER = 'POWER',
  HEART_RATE = 'HEART_RATE',
  OPEN = 'OPEN',
}

// Intensity Levels (must match FIT protocol values)
export enum Intensity {
  ACTIVE = 0,
  REST = 1,
  WARMUP = 2,
  COOLDOWN = 3,
  RECOVERY = 4,
  INTERVAL = 5,
  OTHER = 6,
}

// Training zones mapped to % FTP ranges
export const ZONE_RANGES: Record<number, { low: number; high: number; label: string }> = {
  1: { low: 0,   high: 55,  label: 'Z1 – Active Recovery' },
  2: { low: 56,  high: 75,  label: 'Z2 – Endurance' },
  3: { low: 76,  high: 90,  label: 'Z3 – Tempo' },
  4: { low: 91,  high: 105, label: 'Z4 – Threshold' },
  5: { low: 106, high: 120, label: 'Z5 – VO2max' },
  6: { low: 121, high: 150, label: 'Z6 – Anaerobic' },
  7: { low: 151, high: 200, label: 'Z7 – Neuromuscular' },
};

// Workout Step
export interface WorkoutStep {
  step_type: StepType;
  duration_seconds: number;
  target_type: TargetType;
  // % FTP targets (used for graph + FIT with POWER_PCT mode)
  power_low_pct?: number;
  power_high_pct?: number;
  // Absolute watt targets (used when user typed e.g. "250w" and no FTP set)
  power_watts?: number;
  power_watts_high?: number;
  // HR targets
  heart_rate_low?: number;
  heart_rate_high?: number;
  name?: string;
  notes?: string;
  intensity?: Intensity;
  zone?: number; // original zone number if input was e.g. Z4
  // Internal metadata for ZWO repeat group collapsing (not used by FIT generator)
  _repeatId?: number;
  _repeatCount?: number;
  _repeatStep?: number;
  _repeatSize?: number;
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
