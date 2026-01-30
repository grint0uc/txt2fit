import { StepType, TargetType, Intensity, type Workout, type WorkoutStep, type ParseResult } from '../types';

const INTENSITY_MAP: { [key: string]: Intensity } = {
  warmup: Intensity.WARMUP,
  cooldown: Intensity.WARMUP,
  recovery: Intensity.REST,
  rest: Intensity.REST,
  easy: Intensity.REST,
  endurance: Intensity.ACTIVE,
  tempo: Intensity.ACTIVE,
  threshold: Intensity.ACTIVE,
  sweetspot: Intensity.ACTIVE,
  vo2: Intensity.INTERVAL,
  vo2max: Intensity.INTERVAL,
  interval: Intensity.INTERVAL,
  sprint: Intensity.INTERVAL,
  anaerobic: Intensity.INTERVAL,
};

interface ParsedLine {
  duration_seconds: number;
  power_low_pct?: number;
  power_high_pct?: number;
  heart_rate_low?: number;
  heart_rate_high?: number;
  name?: string;
  notes?: string;
  intensity?: Intensity;
  repeat_count?: number;
  is_special_block?: boolean;
  special_block_type?: 'warmup' | 'cooldown' | 'recovery' | 'open';
}

export class WorkoutParser {
  private errors: string[] = [];
  private warnings: string[] = [];

  parse(workoutText: string): ParseResult {
    this.errors = [];
    this.warnings = [];

    const lines = workoutText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('//'));

    if (lines.length === 0) {
      return {
        success: false,
        errors: ['Workout text is empty'],
      };
    }

    const steps: WorkoutStep[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parsed = this.parseLine(line, i + 1);

      if (!parsed) {
        continue;
      }

      if (parsed.repeat_count && parsed.repeat_count > 1) {
        // Create repeat block
        const repeatSteps = this.createRepeatBlock(parsed, i);
        steps.push(...repeatSteps);
      } else {
        const step = this.buildStep(parsed);
        steps.push(step);
      }
    }

    if (steps.length === 0) {
      return {
        success: false,
        errors: ['No valid workout steps found'],
      };
    }

    const workout: Workout = {
      name: 'Workout',
      steps,
    };

    return {
      success: true,
      workout,
      warnings: this.warnings.length > 0 ? this.warnings : undefined,
    };
  }

  private parseLine(line: string, lineNumber: number): ParsedLine | null {
    // Remove notes (quoted text)
    let notes: string | undefined;
    const notesMatch = line.match(/"([^"]*)"/);
    if (notesMatch) {
      notes = notesMatch[1];
      line = line.replace(/"[^"]*"/, '').trim();
    }

    // Check for repeat syntax (e.g., "3x 5min 100% FTP")
    let repeat_count = 1;
    const repeatMatch = line.match(/^(\d+)x\s+/);
    if (repeatMatch) {
      repeat_count = parseInt(repeatMatch[1], 10);
      line = line.replace(repeatMatch[0], '').trim();
    }

    // Check for special blocks
    for (const [keyword, type] of Object.entries({
      warmup: 'warmup',
      cooldown: 'cooldown',
      recovery: 'recovery',
    })) {
      if (line.toLowerCase().startsWith(keyword)) {
        return this.parseSpecialBlock(line, keyword, type as any, notes);
      }
    }

    // Parse general format: "duration power [notes]"
    const parts = line.split(/\s+/);
    if (parts.length < 1) return null;

    let parsed: ParsedLine = {
      duration_seconds: 0,
      notes,
      repeat_count,
    };

    // Parse duration
    const durationStr = parts[0];
    parsed.duration_seconds = this.parseDuration(durationStr);
    if (parsed.duration_seconds === 0) {
      this.errors.push(`Invalid duration at line ${lineNumber}: ${durationStr}`);
      return null;
    }

    // Parse power target
    let idx = 1;
    if (idx < parts.length && parts[idx].includes('%')) {
      const powerResult = this.parsePower(parts.slice(idx));
      if (powerResult) {
        parsed.power_low_pct = powerResult.low;
        parsed.power_high_pct = powerResult.high;
        parsed.intensity = this.detectIntensity(powerResult.low, powerResult.high);
        idx += powerResult.consumed;
      }
    }

    // Check for intensity keywords
    const remaining = parts.slice(idx).join(' ').toLowerCase();
    for (const [keyword, intensity] of Object.entries(INTENSITY_MAP)) {
      if (remaining.includes(keyword)) {
        parsed.intensity = intensity;
        break;
      }
    }

    return parsed;
  }

  private parseSpecialBlock(
    line: string,
    keyword: string,
    type: 'warmup' | 'cooldown' | 'recovery',
    notes?: string
  ): ParsedLine {
    const durationStr = line.replace(new RegExp(`^${keyword}\\s+`, 'i'), '').split(/\s+/)[0];
    const duration_seconds = this.parseDuration(durationStr);

    const intensityMap = {
      warmup: Intensity.WARMUP,
      cooldown: Intensity.WARMUP,
      recovery: Intensity.REST,
    };

    return {
      duration_seconds,
      is_special_block: true,
      special_block_type: type,
      intensity: intensityMap[type],
      notes,
    };
  }

  private parseDuration(str: string): number {
    const match = str.match(/^(\d+(?:\.\d+)?)(s|sec|m|min|h|hr)?$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase() || 'min';

    const unitMap: { [key: string]: number } = {
      s: 1,
      sec: 1,
      m: 60,
      min: 60,
      h: 3600,
      hr: 3600,
    };

    return value * (unitMap[unit] || 60);
  }

  private parsePower(
    parts: string[]
  ): { low: number; high: number; consumed: number } | null {
    let powerStr = parts[0];
    let consumed = 1;

    // Look for range: "50% - 80% FTP"
    if (parts.length > 1 && parts[1] === '-') {
      powerStr = `${parts[0]}-${parts[2]}`;
      consumed = 3;
    }

    const rangeMatch = powerStr.match(/^(\d+)%?\s*-\s*(\d+)%/);
    if (rangeMatch) {
      const low = parseInt(rangeMatch[1], 10);
      const high = parseInt(rangeMatch[2], 10);
      return { low, high, consumed };
    }

    const singleMatch = powerStr.match(/^(\d+)%/);
    if (singleMatch) {
      const value = parseInt(singleMatch[1], 10);
      return { low: value, high: value, consumed };
    }

    return null;
  }

  private detectIntensity(powerLow: number, powerHigh: number): Intensity {
    const avg = (powerLow + powerHigh) / 2;

    if (avg < 50) return Intensity.REST;
    if (avg < 75) return Intensity.ACTIVE;
    if (avg < 90) return Intensity.ACTIVE;
    if (avg < 110) return Intensity.INTERVAL;
    return Intensity.INTERVAL;
  }

  private buildStep(parsed: ParsedLine): WorkoutStep {
    if (parsed.is_special_block) {
      return this.buildSpecialBlockStep(parsed);
    }

    return {
      step_type: parsed.power_low_pct === parsed.power_high_pct ? StepType.STEADY : StepType.RAMP,
      duration_seconds: parsed.duration_seconds,
      target_type: TargetType.POWER,
      power_low_pct: parsed.power_low_pct,
      power_high_pct: parsed.power_high_pct,
      intensity: parsed.intensity || Intensity.ACTIVE,
      notes: parsed.notes,
    };
  }

  private buildSpecialBlockStep(parsed: ParsedLine): WorkoutStep {
    const type = parsed.special_block_type;

    if (type === 'warmup') {
      return {
        step_type: StepType.WARMUP,
        duration_seconds: parsed.duration_seconds,
        target_type: TargetType.POWER,
        power_low_pct: 40,
        power_high_pct: 75,
        intensity: Intensity.WARMUP,
      };
    }

    if (type === 'cooldown') {
      return {
        step_type: StepType.COOLDOWN,
        duration_seconds: parsed.duration_seconds,
        target_type: TargetType.POWER,
        power_low_pct: 65,
        power_high_pct: 40,
        intensity: Intensity.WARMUP,
      };
    }

    // recovery
    return {
      step_type: StepType.RECOVERY,
      duration_seconds: parsed.duration_seconds,
      target_type: TargetType.POWER,
      power_low_pct: 50,
      power_high_pct: 50,
      intensity: Intensity.REST,
    };
  }

  private createRepeatBlock(parsed: ParsedLine, _startLine: number): WorkoutStep[] {
    const count = parsed.repeat_count || 1;
    const steps: WorkoutStep[] = [];

    for (let i = 0; i < count; i++) {
      steps.push(this.buildStep({ ...parsed, repeat_count: undefined }));
    }

    return steps;
  }
}

export function parseWorkout(text: string): ParseResult {
  const parser = new WorkoutParser();
  return parser.parse(text);
}
