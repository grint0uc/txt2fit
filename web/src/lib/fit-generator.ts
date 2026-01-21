import {
  FIT_HEADER_SIZE,
  FIT_CRC_SIZE,
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

  generate(workout: Workout): Uint8Array {
    this.data = [];
    this.definitions = new Map();

    // Write FIT header
    this.writeHeader(workout.steps.length + 2);

    // Write FileIdMessage
    this.writeFileIdMessage();

    // Write WorkoutMessage
    this.writeWorkoutMessage(workout);

    // Write WorkoutStepMessages
    for (let messageCount = 0; messageCount < workout.steps.length; messageCount++) {
      this.writeWorkoutStepMessage(workout.steps[messageCount], messageCount);
    }

    // Write CRC
    const crc = calculateCrc16(this.data);
    this.data.push(...encodeUint16(crc, LITTLE_ENDIAN));

    return new Uint8Array(this.data);
  }

  private writeHeader(_messageCount: number): void {
    // Header size: 1 byte
    this.data.push(FIT_HEADER_SIZE);

    // Protocol version: 1 byte (2.0)
    this.data.push(0x10);

    // Profile version: 2 bytes
    this.data.push(...encodeUint16(2057, LITTLE_ENDIAN));

    // Data size: 4 bytes
    this.data.push(0, 0, 0, 0);

    // Signature: 4 bytes ".FIT"
    this.data.push(0x2e, 0x46, 0x49, 0x54);
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
    const workoutName = (workout.name || 'Workout').substring(0, 31);
    const message: WorkoutMessage = {
      workoutName,
      numValidSteps: workout.steps.length,
      sport: Sport.CYCLING,
    };

    this.writeMessage(MessageType.WORKOUT, [
      { field: 4, value: encodeString(workoutName), type: DataTypeId.STRING },
      { field: 5, value: encodeUint16(message.numValidSteps, LITTLE_ENDIAN), type: DataTypeId.UINT16 },
      { field: 6, value: encodeUint8(message.sport), type: DataTypeId.ENUM },
    ]);
  }

  private writeWorkoutStepMessage(step: WorkoutStep, messageIndex: number): void {
    const message: WorkoutStepMessage = {
      messageIndex,
      durationType: WorkoutStepDuration.TIME,
      durationValue: step.duration_seconds,
      targetType: this.mapTargetType(step.target_type),
      intensity: (step.intensity as unknown as Intensity) || Intensity.ACTIVE,
      notes: step.notes,
    };

    // Handle power targets
    if (step.power_low_pct !== undefined && step.power_high_pct !== undefined) {
      message.customTargetValueLow = Math.round(step.power_low_pct);
      message.customTargetValueHigh = Math.round(step.power_high_pct);
    }

    // Handle cadence targets
    if (step.cadence_low !== undefined && step.cadence_high !== undefined) {
      message.customTargetCadenceLow = step.cadence_low;
      message.customTargetCadenceHigh = step.cadence_high;
    }

    const fields: Field[] = [
      { field: 0, value: encodeUint16(messageIndex, LITTLE_ENDIAN), type: DataTypeId.UINT16 },
      { field: 1, value: encodeUint32(message.durationValue, LITTLE_ENDIAN), type: DataTypeId.UINT32 },
      { field: 2, value: encodeUint8(message.durationType), type: DataTypeId.ENUM },
      { field: 3, value: encodeUint8(message.targetType), type: DataTypeId.ENUM },
      { field: 4, value: encodeUint8(message.intensity), type: DataTypeId.ENUM },
    ];

    if (message.customTargetValueLow !== undefined) {
      fields.push({ field: 7, value: encodeUint16(message.customTargetValueLow, LITTLE_ENDIAN), type: DataTypeId.UINT16 });
    }

    if (message.customTargetValueHigh !== undefined) {
      fields.push({ field: 8, value: encodeUint16(message.customTargetValueHigh, LITTLE_ENDIAN), type: DataTypeId.UINT16 });
    }

    if (message.customTargetCadenceLow !== undefined) {
      fields.push({ field: 9, value: encodeUint8(message.customTargetCadenceLow), type: DataTypeId.UINT8 });
    }

    if (message.customTargetCadenceHigh !== undefined) {
      fields.push({ field: 10, value: encodeUint8(message.customTargetCadenceHigh), type: DataTypeId.UINT8 });
    }

    if (message.notes) {
      fields.push({ field: 13, value: encodeString(message.notes), type: DataTypeId.STRING });
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
  const fitData = generator.generate(workout);

  // Recalculate after data is written
  const header = new Uint8Array(14);
  header[0] = FIT_HEADER_SIZE;
  header[1] = 0x10;
  header.set(new Uint8Array(encodeUint16(2057, LITTLE_ENDIAN)), 2);

  const dataSize = fitData.length - FIT_HEADER_SIZE - FIT_CRC_SIZE;
  header.set(new Uint8Array(encodeUint32(dataSize, LITTLE_ENDIAN)), 4);
  header[8] = 0x2e;
  header[9] = 0x46;
  header[10] = 0x49;
  header[11] = 0x54;

  const headerCrc = calculateCrc16(Array.from(header));
  const headerCrcBytes = encodeUint16(headerCrc, LITTLE_ENDIAN);
  header.set(new Uint8Array(headerCrcBytes), 12);

  // Return properly formatted FIT file
  const result = new Uint8Array(header.length + fitData.length);
  result.set(header);
  result.set(fitData, header.length);

  return result;
}
