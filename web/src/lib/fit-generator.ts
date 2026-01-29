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
  type FileIdMessage,
  type WorkoutMessage,
  type WorkoutStepMessage,
} from './fit-types';
import type { Workout, WorkoutStep, TargetType } from '../types';

const LITTLE_ENDIAN = true;
const LOCAL_MESSAGE_TYPE = 0;

export class FitGenerator {
  private data: number[] = [];
  private definitions: Map<number, MessageDefinition> = new Map();
  private dataSizeIndex: number = 0;

  generate(workout: Workout): Uint8Array {
    this.data = [];
    this.definitions = new Map();

    console.log(`[FIT Gen] Generating workout: "${workout.name}" with ${workout.steps.length} steps`);
    workout.steps.forEach((step, i) => {
      console.log(`[FIT Gen] Step ${i}: ${step.name || 'unnamed'}, ${step.duration_seconds}s, ${step.power_low_pct}-${step.power_high_pct}% FTP`);
    });

    // Write FIT header
    this.writeHeader(workout.steps.length + 2);
    console.log(`[FIT Gen] After header: ${this.data.length} bytes`);

    // Write FileIdMessage
    this.writeFileIdMessage();
    console.log(`[FIT Gen] After FileID: ${this.data.length} bytes`);

    // Write WorkoutMessage
    this.writeWorkoutMessage(workout);
    console.log(`[FIT Gen] After Workout: ${this.data.length} bytes`);

    // Write WorkoutStepMessages
    for (let messageCount = 0; messageCount < workout.steps.length; messageCount++) {
      this.writeWorkoutStepMessage(workout.steps[messageCount], messageCount);
      console.log(`[FIT Gen] After Step ${messageCount}: ${this.data.length} bytes`);
    }

    // Update data size in header before CRC
    const dataSize = this.data.length - FIT_HEADER_SIZE;
    const dataSizeBytes = encodeUint32(dataSize, LITTLE_ENDIAN);
    this.data[this.dataSizeIndex] = dataSizeBytes[0];
    this.data[this.dataSizeIndex + 1] = dataSizeBytes[1];
    this.data[this.dataSizeIndex + 2] = dataSizeBytes[2];
    this.data[this.dataSizeIndex + 3] = dataSizeBytes[3];

    // Write file CRC over complete file (12-byte header, no header CRC)
    const fileCrc = calculateCrc16(this.data);
    this.data.push(...encodeUint16(fileCrc, LITTLE_ENDIAN));

    console.log(`[FIT Gen] Final size: ${this.data.length} bytes (data: ${dataSize}, CRC: 2)`);
    return new Uint8Array(this.data);
  }

  private writeHeader(_messageCount: number): void {
    // Header size: 1 byte (12 for header without CRC - matches Python)
    this.data.push(12);

    // Protocol version: 1 byte (match Python fit-tool)
    this.data.push(0x23);

    // Profile version: 2 bytes (match Python fit-tool)
    this.data.push(...encodeUint16(2160, LITTLE_ENDIAN));

    // Data size: 4 bytes - PLACEHOLDER, will be updated later
    const dataSizeIndex = this.data.length;
    this.data.push(0, 0, 0, 0);

    // Signature: 4 bytes ".FIT"
    this.data.push(0x2e, 0x46, 0x49, 0x54);

    // Store index for later update (no header CRC for 12-byte header)
    this.dataSizeIndex = dataSizeIndex;
  }

  private writeFileIdMessage(): void {
    const message: FileIdMessage = {
      type: FileType.WORKOUT,
      manufacturer: Manufacturer.GARMIN,
      product: 0xFFFF,
      serialNumber: Math.floor(Math.random() * 0xFFFFFFFF),
      timeCreated: Math.floor(Date.now() / 1000),
    };

    this.writeMessage(MessageType.FILE_ID, [
      { field: 0, value: encodeUint8(message.type), type: DataTypeId.ENUM },
      { field: 1, value: encodeUint16(message.manufacturer || 0, LITTLE_ENDIAN), type: DataTypeId.UINT16 },
      { field: 2, value: encodeUint16(message.product || 0, LITTLE_ENDIAN), type: DataTypeId.UINT16 },
      { field: 3, value: encodeUint32(message.serialNumber || 0, LITTLE_ENDIAN), type: DataTypeId.UINT32Z },
      { field: 4, value: encodeUint32(message.timeCreated || 0, LITTLE_ENDIAN), type: DataTypeId.UINT32 },
    ]);
  }

  private writeWorkoutMessage(workout: Workout): void {
    const STRING_FIELD_SIZE = 50; // Fixed size for string fields to match Python
    const workoutName = workout.name || 'Workout';
    const message: WorkoutMessage = {
      workoutName,
      numValidSteps: workout.steps.length,
      sport: Sport.CYCLING,
    };

    this.writeMessage(MessageType.WORKOUT, [
      { field: 4, value: encodeUint8(message.sport), type: DataTypeId.ENUM },
      { field: 6, value: encodeUint16(message.numValidSteps, LITTLE_ENDIAN), type: DataTypeId.UINT16 },
      { field: 8, value: encodeString(workoutName, STRING_FIELD_SIZE), type: DataTypeId.STRING },
    ]);
  }

  private writeWorkoutStepMessage(step: WorkoutStep, messageIndex: number): void {
    const STRING_FIELD_SIZE = 50; // Fixed size for string fields to match Python

    const message: WorkoutStepMessage = {
      messageIndex,
      wktStepName: step.name || `Step ${messageIndex + 1}`,
      durationType: WorkoutStepDuration.TIME,
      durationValue: Math.round(step.duration_seconds * 1000), // Convert to milliseconds
      targetType: this.mapTargetType(step.target_type),
      targetValue: 0, // Set to 0 for custom targets (as per Garmin SDK)
      // Always use ACTIVE intensity for now (until UI properly sets intensity)
      intensity: Intensity.ACTIVE,
      notes: step.notes,
    };

    // Handle power targets
    if (step.power_low_pct !== undefined && step.power_high_pct !== undefined) {
      const powerLow = Math.round(step.power_low_pct);
      const powerHigh = Math.round(step.power_high_pct);

      // Use standard custom_target_value fields for all power targets
      message.customTargetValueLow = powerLow;
      message.customTargetValueHigh = powerHigh;
    }

    // NOTE: Cadence targets are NOT written to FIT fields
    // Cadence should only be included in the notes field
    // This is because Hammerhead devices reject files with cadence + notes fields

    // Build fields array with correct FIT protocol field numbers
    const fields: Field[] = [];

    // Field 254: message_index (UINT16)
    fields.push({ field: 254, value: encodeUint16(messageIndex, LITTLE_ENDIAN), type: DataTypeId.UINT16 });

    // Field 0: workout_step_name (STRING, 50 bytes fixed)
    if (message.wktStepName) {
      fields.push({ field: 0, value: encodeString(message.wktStepName, STRING_FIELD_SIZE), type: DataTypeId.STRING });
    }

    // Field 1: duration_type (ENUM)
    fields.push({ field: 1, value: encodeUint8(message.durationType), type: DataTypeId.ENUM });

    // Field 2: duration_value (UINT32)
    fields.push({ field: 2, value: encodeUint32(message.durationValue, LITTLE_ENDIAN), type: DataTypeId.UINT32 });

    // Field 3: target_type (ENUM)
    fields.push({ field: 3, value: encodeUint8(message.targetType), type: DataTypeId.ENUM });

    // Field 4: target_value (UINT32)
    fields.push({ field: 4, value: encodeUint32(message.targetValue || 0, LITTLE_ENDIAN), type: DataTypeId.UINT32 });

    // Field 5: custom_target_value_low (UINT32)
    if (message.customTargetValueLow !== undefined) {
      fields.push({ field: 5, value: encodeUint32(message.customTargetValueLow, LITTLE_ENDIAN), type: DataTypeId.UINT32 });
    }

    // Field 6: custom_target_value_high (UINT32)
    if (message.customTargetValueHigh !== undefined) {
      fields.push({ field: 6, value: encodeUint32(message.customTargetValueHigh, LITTLE_ENDIAN), type: DataTypeId.UINT32 });
    }

    // Field 7: intensity (ENUM)
    fields.push({ field: 7, value: encodeUint8(message.intensity), type: DataTypeId.ENUM });

    // Field 8: notes (STRING, 50 bytes fixed)
    if (message.notes) {
      fields.push({ field: 8, value: encodeString(message.notes, STRING_FIELD_SIZE), type: DataTypeId.STRING });
    }

    this.writeMessage(MessageType.WORKOUT_STEP, fields);
  }

  private mapTargetType(targetType: TargetType): WorkoutStepTarget {
    // Import TargetType enum from types
    const targetMap: { [key: string]: WorkoutStepTarget } = {
      POWER: WorkoutStepTarget.POWER,
      HEART_RATE: WorkoutStepTarget.HEART_RATE,
      CADENCE: WorkoutStepTarget.CADENCE,
    };

    return targetMap[targetType] || WorkoutStepTarget.POWER;
  }

  private writeMessage(messageType: MessageType, fields: Field[]): void {
    // Write message definition (if not already defined)
    if (!this.definitions.has(messageType)) {
      this.writeMessageDefinition(messageType, fields);
    }

    // Write message data
    this.writeMessageData(messageType, fields);
  }

  private writeMessageDefinition(messageType: MessageType, fields: Field[]): void {
    // Normal header (not compressed)
    const header = 0x40 | LOCAL_MESSAGE_TYPE; // bit 6 set for definition message
    this.data.push(header);

    // Reserved
    this.data.push(0);

    // Architecture (0 = little-endian)
    this.data.push(LITTLE_ENDIAN ? 0 : 1);

    // Global message number
    this.data.push(...encodeUint16(messageType, LITTLE_ENDIAN));

    // Number of fields
    this.data.push(fields.length);

    // Field definitions
    for (const field of fields) {
      this.data.push(field.field); // Field definition number
      this.data.push(this.getFieldSize(field.type, field.value.length)); // Size in bytes
      this.data.push(field.type); // Data type
    }

    // Store definition
    this.definitions.set(messageType, {
      messageType,
      fields,
    });
  }

  private writeMessageData(_messageType: MessageType, fields: Field[]): void {
    // Normal header (not compressed) with local message type
    const header = LOCAL_MESSAGE_TYPE;
    this.data.push(header);

    // Write field values
    for (const field of fields) {
      this.data.push(...field.value);
    }
  }

  private getFieldSize(dataType: DataTypeId, arrayLength: number): number {
    const sizeMap: { [key: number]: number } = {
      [DataTypeId.ENUM]: 1,
      [DataTypeId.UINT8]: 1,
      [DataTypeId.UINT8Z]: 1,
      [DataTypeId.SINT8]: 1,
      [DataTypeId.UINT16]: 2,
      [DataTypeId.UINT16Z]: 2,
      [DataTypeId.SINT16]: 2,
      [DataTypeId.UINT32]: 4,
      [DataTypeId.UINT32Z]: 4,
      [DataTypeId.SINT32]: 4,
      [DataTypeId.FLOAT32]: 4,
      [DataTypeId.FLOAT64]: 8,
      [DataTypeId.STRING]: arrayLength,
    };

    return sizeMap[dataType] || arrayLength;
  }
}

interface Field {
  field: number;
  value: number[];
  type: DataTypeId;
}

interface MessageDefinition {
  messageType: MessageType;
  fields: Field[];
}

export function generateFitFile(workout: Workout): Uint8Array {
  const generator = new FitGenerator();
  return generator.generate(workout);
}
