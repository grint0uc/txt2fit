import {
  StepType,
  TargetType,
  Intensity,
  ZONE_RANGES,
  type Workout,
  type WorkoutStep,
  type ParseResult,
} from '../types';

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
  // % FTP power
  power_low_pct?: number;
  power_high_pct?: number;
  // Absolute watts
  power_watts?: number;
  power_watts_high?: number;
  // HR
  heart_rate_low?: number;
  heart_rate_high?: number;
  name?: string;
  notes?: string;
  intensity?: Intensity;
  repeat_count?: number;
  zone?: number;
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

      // Multi-step repeat block: 3x (5min 100%FTP, 2min 50%FTP)
      const blockMatch = line.match(/^(\d+)x\s*\((.+)\)$/i);
      if (blockMatch) {
        const count = parseInt(blockMatch[1], 10);
        const blockSteps: WorkoutStep[] = blockMatch[2]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .flatMap((innerLine) => {
            const innerParsed = this.parseLine(innerLine, i + 1);
            return innerParsed ? [this.buildStep(innerParsed)] : [];
          });
        for (let r = 0; r < count; r++) steps.push(...blockSteps);
        continue;
      }

      const parsed = this.parseLine(line, i + 1);

      if (!parsed) {
        continue;
      }

      if (parsed.repeat_count && parsed.repeat_count > 1) {
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

    // Check for special blocks: warmup, cooldown, recovery
    const specialKeywords = { warmup: 'warmup', cooldown: 'cooldown', recovery: 'recovery' } as const;
    for (const [keyword, type] of Object.entries(specialKeywords)) {
      if (line.toLowerCase().startsWith(keyword)) {
        return this.parseSpecialBlock(line, keyword, type as 'warmup' | 'cooldown' | 'recovery', notes);
      }
    }

    // Parse general format: "duration [target] [keywords] [notes]"
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

    // Parse target (power/zone/HR) from remaining parts
    let idx = 1;
    if (idx < parts.length) {
      const targetResult = this.parseTarget(parts.slice(idx));
      if (targetResult) {
        Object.assign(parsed, targetResult.parsed);
        idx += targetResult.consumed;

        // Auto-detect intensity from power %
        if (parsed.power_low_pct !== undefined && parsed.power_high_pct !== undefined) {
          parsed.intensity = this.detectIntensity(parsed.power_low_pct, parsed.power_high_pct);
        }
      }
    }

    // Check for intensity keywords in remaining text
    const remaining = parts.slice(idx).join(' ').toLowerCase();
    for (const [keyword, intensity] of Object.entries(INTENSITY_MAP)) {
      if (remaining.includes(keyword)) {
        parsed.intensity = intensity;
        break;
      }
    }

    return parsed;
  }

  /**
   * Parse a target from an array of tokens. Supports:
   *   % FTP:   "90%", "85%-95%", "85% - 95%", "85-95%"
   *   Watts:   "250w", "250W", "200w-300w"
   *   Zones:   "Z4", "zone4", "z4"
   */
  private parseTarget(
    parts: string[]
  ): { parsed: Partial<ParsedLine>; consumed: number } | null {
    const token = parts[0];

    // --- Zone: Z1–Z7 or zone1–zone7 ---
    const zoneMatch = token.match(/^z(?:one)?(\d)/i);
    if (zoneMatch) {
      const zoneNum = parseInt(zoneMatch[1], 10);
      if (zoneNum >= 1 && zoneNum <= 7) {
        const range = ZONE_RANGES[zoneNum];
        return {
          parsed: {
            power_low_pct: range.low,
            power_high_pct: range.high,
            zone: zoneNum,
            intensity: this.detectIntensity(range.low, range.high),
          },
          consumed: 1,
        };
      }
    }

    // --- Absolute Watts: "250w", "200w-300w" ---
    const wattsMatch = token.match(/^(\d+(?:\.\d+)?)w(?:-(\d+(?:\.\d+)?)w)?$/i);
    if (wattsMatch) {
      const low = parseFloat(wattsMatch[1]);
      const high = wattsMatch[2] ? parseFloat(wattsMatch[2]) : low;
      return {
        parsed: {
          power_watts: low,
          power_watts_high: high,
        },
        consumed: 1,
      };
    }

    // --- % FTP: "90%", "85-95%", "85% - 95%", "85%-95%" ---
    if (token.includes('%')) {
      const powerResult = this.parsePowerPct(parts);
      if (powerResult) {
        return {
          parsed: {
            power_low_pct: powerResult.low,
            power_high_pct: powerResult.high,
          },
          consumed: powerResult.consumed,
        };
      }
    }

    return null;
  }

  private parseSpecialBlock(
    line: string,
    keyword: string,
    type: 'warmup' | 'cooldown' | 'recovery',
    notes?: string
  ): ParsedLine {
    const afterKeyword = line.replace(new RegExp(`^${keyword}\\s+`, 'i'), '');
    const durationStr = afterKeyword.split(/\s+/)[0];
    const duration_seconds = this.parseDuration(durationStr);

    const intensityMap = {
      warmup: Intensity.WARMUP,
      cooldown: Intensity.COOLDOWN,
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

  /**
   * Parse % FTP power targets.
   * Handles: "90%", "90% FTP", "85-95%", "85% - 95%", "85%-95%"
   */
  private parsePowerPct(
    parts: string[]
  ): { low: number; high: number; consumed: number } | null {
    let powerStr = parts[0];
    let consumed = 1;

    // Spaced range: "85% - 95%"
    if (parts.length >= 3 && parts[1] === '-') {
      powerStr = `${parts[0]}-${parts[2]}`;
      consumed = 3;
    }

    // Normalise: "85%-95%" or "85% - 95%" or "85-95%"
    // After the join above it becomes "85%-95%" or "85%-95%"
    const rangeMatch = powerStr.match(/^(\d+)%?\s*-\s*(\d+)%/);
    if (rangeMatch) {
      return {
        low: parseInt(rangeMatch[1], 10),
        high: parseInt(rangeMatch[2], 10),
        consumed,
      };
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
    if (avg < 56) return Intensity.REST;
    if (avg < 76) return Intensity.ACTIVE;
    if (avg < 106) return Intensity.ACTIVE;
    return Intensity.INTERVAL;
  }

  private buildStep(parsed: ParsedLine): WorkoutStep {
    if (parsed.is_special_block) {
      return this.buildSpecialBlockStep(parsed);
    }

    const hasWatts = parsed.power_watts !== undefined;
    const hasPct = parsed.power_low_pct !== undefined;

    // Determine step type
    let step_type = StepType.STEADY;
    if (hasPct && parsed.power_low_pct !== parsed.power_high_pct) {
      step_type = StepType.RAMP;
    } else if (hasWatts && parsed.power_watts !== parsed.power_watts_high) {
      step_type = StepType.RAMP;
    }

    const step: WorkoutStep = {
      step_type,
      duration_seconds: parsed.duration_seconds,
      target_type: TargetType.POWER,
      intensity: parsed.intensity || Intensity.ACTIVE,
      notes: parsed.notes,
    };

    if (hasPct) {
      step.power_low_pct = parsed.power_low_pct;
      step.power_high_pct = parsed.power_high_pct;
    }

    if (hasWatts) {
      step.power_watts = parsed.power_watts;
      step.power_watts_high = parsed.power_watts_high;
    }

    if (parsed.zone !== undefined) {
      step.zone = parsed.zone;
    }

    return step;
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
        notes: parsed.notes,
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
        notes: parsed.notes,
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
      notes: parsed.notes,
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
