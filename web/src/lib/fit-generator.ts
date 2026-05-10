import {
  FIT_HEADER_SIZE,
  DataTypeId,
  MessageType,
  FileType,
  Sport,
  Intensity,
  WorkoutStepDuration,
  WorkoutStepTarget,
  Manufacturer,
  encodeUint8,
  encodeUint16,
  encodeUint32,
  encodeString,
  calculateCrc16,
} from './fit-types';
import type { Workout, WorkoutStep, TargetType } from '../types';

const LITTLE_ENDIAN = true;
const STRING_SIZE = 50; // Fixed size for all string fields – must match across definition + data

// Local message type slots
const LOCAL_FILE_ID   = 0;
const LOCAL_WORKOUT   = 1;
const LOCAL_WKT_STEP  = 2;

export class FitGenerator {
  private data: number[] = [];
  private dataSizeIndex: number = 0;
  private stepIndex: number = 0;

  generate(workout: Workout): Uint8Array {
    this.data = [];
    this.stepIndex = 0;

    // Count total steps (including repeat markers)
    const totalMessages = this.countMessages(workout);

    this.writeHeader();
    this.writeFileIdDefinition();
    this.writeFileIdData();
    this.writeWorkoutDefinition();
    this.writeWorkoutData(workout, totalMessages);
    this.writeWorkoutStepDefinition();

    // Write steps
    for (const step of workout.steps) {
      this.writeWorkoutStepData(step, this.stepIndex);
      this.stepIndex++;
    }

    // Patch data size
    const dataSize = this.data.length - FIT_HEADER_SIZE;
    const dataSizeBytes = encodeUint32(dataSize, LITTLE_ENDIAN);
    this.data[this.dataSizeIndex]     = dataSizeBytes[0];
    this.data[this.dataSizeIndex + 1] = dataSizeBytes[1];
    this.data[this.dataSizeIndex + 2] = dataSizeBytes[2];
    this.data[this.dataSizeIndex + 3] = dataSizeBytes[3];

    // File CRC
    const fileCrc = calculateCrc16(this.data);
    this.data.push(...encodeUint16(fileCrc, LITTLE_ENDIAN));

    return new Uint8Array(this.data);
  }

  // ─── Header ───────────────────────────────────────────────────────────────

  private writeHeader(): void {
    this.data.push(12);                                    // Header size (12, no CRC)
    this.data.push(0x23);                                  // Protocol version
    this.data.push(...encodeUint16(2160, LITTLE_ENDIAN));  // Profile version
    this.dataSizeIndex = this.data.length;
    this.data.push(0, 0, 0, 0);                            // Data size placeholder
    this.data.push(0x2e, 0x46, 0x49, 0x54);               // ".FIT"
  }

  // ─── FILE_ID ──────────────────────────────────────────────────────────────

  private writeFileIdDefinition(): void {
    // Definition header: normal definition, local type = LOCAL_FILE_ID
    this.data.push(0x40 | LOCAL_FILE_ID);
    this.data.push(0);                  // Reserved
    this.data.push(0);                  // Little-endian
    this.data.push(...encodeUint16(MessageType.FILE_ID, LITTLE_ENDIAN));
    this.data.push(5);                  // Field count
    // Field defs: [number, size, type]
    this.data.push(0, 1, DataTypeId.ENUM);     // type
    this.data.push(1, 2, DataTypeId.UINT16);   // manufacturer
    this.data.push(2, 2, DataTypeId.UINT16);   // product
    this.data.push(3, 4, DataTypeId.UINT32Z);  // serial_number
    this.data.push(4, 4, DataTypeId.UINT32);   // time_created
  }

  private writeFileIdData(): void {
    this.data.push(LOCAL_FILE_ID);
    this.data.push(...encodeUint8(FileType.WORKOUT));
    this.data.push(...encodeUint16(Manufacturer.GARMIN, LITTLE_ENDIAN));
    this.data.push(...encodeUint16(0xFFFF, LITTLE_ENDIAN));
    this.data.push(...encodeUint32(Math.floor(Math.random() * 0xFFFFFFFF), LITTLE_ENDIAN));
    this.data.push(...encodeUint32(Math.floor(Date.now() / 1000), LITTLE_ENDIAN));
  }

  // ─── WORKOUT ──────────────────────────────────────────────────────────────

  private writeWorkoutDefinition(): void {
    this.data.push(0x40 | LOCAL_WORKOUT);
    this.data.push(0);
    this.data.push(0);
    this.data.push(...encodeUint16(MessageType.WORKOUT, LITTLE_ENDIAN));
    this.data.push(3);
    this.data.push(4,  1,           DataTypeId.ENUM);    // sport
    this.data.push(6,  2,           DataTypeId.UINT16);  // num_valid_steps
    this.data.push(8,  STRING_SIZE, DataTypeId.STRING);  // workout_name
  }

  private writeWorkoutData(workout: Workout, numValidSteps: number): void {
    this.data.push(LOCAL_WORKOUT);
    this.data.push(...encodeUint8(Sport.CYCLING));
    this.data.push(...encodeUint16(numValidSteps, LITTLE_ENDIAN));
    this.data.push(...encodeString(workout.name || 'Workout', STRING_SIZE));
  }

  // ─── WORKOUT_STEP ─────────────────────────────────────────────────────────
  // IMPORTANT: definition and data MUST have exactly the same fields in the
  // same order every time. Variable fields corrupt the file. We always write
  // all fields, padding strings with nulls.

  private writeWorkoutStepDefinition(): void {
    this.data.push(0x40 | LOCAL_WKT_STEP);
    this.data.push(0);
    this.data.push(0);
    this.data.push(...encodeUint16(MessageType.WORKOUT_STEP, LITTLE_ENDIAN));
    this.data.push(9); // Always 9 fields – must match writeWorkoutStepData
    // [field_def_number, size_bytes, base_type]
    this.data.push(254, 2,           DataTypeId.UINT16);  // message_index
    this.data.push(0,   STRING_SIZE, DataTypeId.STRING);  // wkt_step_name
    this.data.push(1,   1,           DataTypeId.ENUM);    // duration_type
    this.data.push(2,   4,           DataTypeId.UINT32);  // duration_value
    this.data.push(3,   1,           DataTypeId.ENUM);    // target_type
    this.data.push(4,   4,           DataTypeId.UINT32);  // target_value
    this.data.push(5,   4,           DataTypeId.UINT32);  // custom_target_value_low
    this.data.push(6,   4,           DataTypeId.UINT32);  // custom_target_value_high
    this.data.push(7,   1,           DataTypeId.ENUM);    // intensity
    // Note: we deliberately exclude field 8 (notes/STRING) because it makes
    // the definition fixed and simpler. Step notes go in wkt_step_name instead
    // when present, or we can add it as a second definition slot if needed.
  }

  private writeWorkoutStepData(step: WorkoutStep, index: number): void {
    this.data.push(LOCAL_WKT_STEP);

    // 254: message_index
    this.data.push(...encodeUint16(index, LITTLE_ENDIAN));

    // 0: wkt_step_name (always STRING_SIZE bytes)
    const stepName = step.notes
      ? `${step.name || `Step ${index + 1}`}: ${step.notes}`.slice(0, STRING_SIZE - 1)
      : (step.name || `Step ${index + 1}`);
    this.data.push(...encodeString(stepName, STRING_SIZE));

    // 1: duration_type
    this.data.push(...encodeUint8(WorkoutStepDuration.TIME));

    // 2: duration_value (milliseconds)
    this.data.push(...encodeUint32(Math.round(step.duration_seconds * 1000), LITTLE_ENDIAN));

    // Resolve power values
    const { targetType, targetValue, customLow, customHigh } = this.resolveTarget(step);

    // 3: target_type
    this.data.push(...encodeUint8(targetType));

    // 4: target_value
    this.data.push(...encodeUint32(targetValue, LITTLE_ENDIAN));

    // 5: custom_target_value_low
    this.data.push(...encodeUint32(customLow, LITTLE_ENDIAN));

    // 6: custom_target_value_high
    this.data.push(...encodeUint32(customHigh, LITTLE_ENDIAN));

    // 7: intensity
    this.data.push(...encodeUint8(this.resolveIntensity(step)));
  }

  private resolveTarget(step: WorkoutStep): {
    targetType: number;
    targetValue: number;
    customLow: number;
    customHigh: number;
  } {
    if (step.target_type === 'OPEN' as TargetType) {
      return { targetType: WorkoutStepTarget.OPEN, targetValue: 0, customLow: 0, customHigh: 0 };
    }

    if (step.target_type === 'HEART_RATE' as TargetType) {
      const low  = step.heart_rate_low  ? step.heart_rate_low  + 100 : 0;
      const high = step.heart_rate_high ? step.heart_rate_high + 100 : 0;
      return { targetType: WorkoutStepTarget.HEART_RATE, targetValue: 0, customLow: low, customHigh: high };
    }

    // POWER – use % FTP (raw percentage, e.g. 85 for 85%)
    // Clamp to [min, max] so custom_target_value_low ≤ custom_target_value_high as FIT requires.
    // The parser may store cooldown as (65, 40) for correct web-graph rendering; intensity=COOLDOWN
    // tells the device the direction is high→low.
    const a = Math.round(step.power_low_pct  ?? 0);
    const b = Math.round(step.power_high_pct ?? a);
    const low  = Math.min(a, b);
    const high = Math.max(a, b);
    return { targetType: WorkoutStepTarget.POWER, targetValue: 0, customLow: low, customHigh: high };
  }

  private resolveIntensity(step: WorkoutStep): number {
    if (step.intensity !== undefined) return step.intensity as number;

    const avg = ((step.power_low_pct ?? 0) + (step.power_high_pct ?? step.power_low_pct ?? 0)) / 2;
    if (avg < 56)  return Intensity.RECOVERY;
    if (avg < 106) return Intensity.ACTIVE;
    return Intensity.INTERVAL;
  }

  private countMessages(workout: Workout): number {
    return workout.steps.length;
  }
}

export function generateFitFile(workout: Workout): Uint8Array {
  const generator = new FitGenerator();
  return generator.generate(workout);
}
