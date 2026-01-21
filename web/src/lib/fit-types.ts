/**
 * FIT Protocol TypeScript Types and Constants
 * Based on FIT SDK specification for cycling workouts
 */

// FIT Constants
export const FIT_HEADER_SIZE = 14;
export const FIT_CRC_SIZE = 2;
export const FIT_DATA_TYPE_SIZE = 1;
export const FIT_FIELD_HEADER_SIZE = 1;
export const FIT_NORMAL_HEADER_SIZE = 5;
export const FIT_COMPRESSED_HEADER_SIZE = 1;

// Magic byte for FIT files
export const FIT_FILE_SIGNATURE = 0x2e;

// Scaling factors (FIT protocol)
export const FTP_SCALE = 1; // 0-1000 scale for % FTP
export const HR_ABSOLUTE_OFFSET = 100; // Offset for absolute HR values
export const DURATION_MS_SCALE = 1000; // Duration in milliseconds

// Data Type IDs
export enum DataTypeId {
  ENUM = 0,
  SINT8 = 1,
  UINT8 = 2,
  SINT16 = 3,
  UINT16 = 4,
  SINT32 = 5,
  UINT32 = 6,
  STRING = 7,
  FLOAT32 = 8,
  FLOAT64 = 9,
  UINT8Z = 10,
  UINT16Z = 11,
  UINT32Z = 12,
  BYTE = 13,
}

// Message Types
export enum MessageType {
  FILE_ID = 0,
  WORKOUT = 26,
  WORKOUT_STEP = 27,
}

// File Types
export enum FileType {
  WORKOUT = 4,
}

// Sports
export enum Sport {
  CYCLING = 2,
}

// Intensities
export enum Intensity {
  WARM_UP = 0,
  ACTIVE = 1,
  REST = 2,
  INTERVAL = 3,
}

// Workout Step Duration Types
export enum WorkoutStepDuration {
  TIME = 0,
  DISTANCE = 1,
  HR_LESS_THAN = 2,
  HR_GREATER_THAN = 3,
  CALORIES = 4,
  OPEN = 5,
  REPEAT_UNTIL_STEPS_CMPLT = 6,
  REPEAT_UNTIL_TIME = 7,
  REPEAT_UNTIL_DISTANCE = 8,
  REPEAT_UNTIL_CALORIES = 9,
  REPEAT_UNTIL_HR_LESS_THAN = 10,
  REPEAT_UNTIL_HR_GREATER_THAN = 11,
}

// Workout Step Target Types
export enum WorkoutStepTarget {
  POWER = 1,
  HEART_RATE = 2,
  CADENCE = 3,
  GRADE = 4,
  RESISTANCE = 5,
  OPEN = 6,
}

// Manufacturers
export enum Manufacturer {
  GARMIN = 1,
  WAHOO = 0xF1,
  HAMMERHEAD = 263,
}

// Field definitions for messages
export interface FieldDefinition {
  fieldDefinitionNumber: number;
  size: number;
  dataType: DataTypeId;
}

export interface MessageDefinition {
  reservedByte: number;
  architecture: number; // 0 = little-endian, 1 = big-endian
  globalMessageNumber: number;
  numberOfFields: number;
  fields: FieldDefinition[];
}

// FIT Message structures
export interface FileIdMessage {
  type: FileType;
  manufacturer?: Manufacturer;
  product?: number;
  serialNumber?: number;
  timeCreated?: number;
}

export interface WorkoutMessage {
  workoutName: string;
  subSport?: number;
  numValidSteps: number;
  sport: Sport;
}

export interface WorkoutStepMessage {
  messageIndex?: number;
  wktStepName?: string;
  durationType: WorkoutStepDuration;
  durationValue: number;
  targetType: WorkoutStepTarget;
  targetValue?: number;
  customTargetValueLow?: number;
  customTargetValueHigh?: number;
  intensity: Intensity;
  notes?: string;
  customTargetCadenceLow?: number;
  customTargetCadenceHigh?: number;
}

// Binary encoding helpers
export function encodeUint8(value: number): number[] {
  return [value & 0xFF];
}

export function encodeUint16(value: number, littleEndian = true): number[] {
  const bytes = [value & 0xFF, (value >> 8) & 0xFF];
  return littleEndian ? bytes : bytes.reverse();
}

export function encodeUint32(value: number, littleEndian = true): number[] {
  const bytes = [
    value & 0xFF,
    (value >> 8) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 24) & 0xFF,
  ];
  return littleEndian ? bytes : bytes.reverse();
}

export function encodeSint8(value: number): number[] {
  return [value < 0 ? 256 + value : value];
}

export function encodeSint16(value: number, littleEndian = true): number[] {
  if (value < 0) {
    value = 0x10000 + value;
  }
  const bytes = [value & 0xFF, (value >> 8) & 0xFF];
  return littleEndian ? bytes : bytes.reverse();
}

export function encodeString(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

// CRC16 calculation for FIT protocol
export function calculateCrc16(data: number[]): number {
  const CRC_TABLE = generateCrcTable();
  let crc = 0;

  for (const byte of data) {
    crc = ((crc << 8) ^ CRC_TABLE[((crc >> 8) ^ byte) & 0xFF]) & 0xFFFF;
  }

  return crc;
}

function generateCrcTable(): number[] {
  const table: number[] = [];

  for (let i = 0; i < 256; i++) {
    let crc = 0;
    let code = i;

    for (let j = 0; j < 8; j++) {
      code = code & 0x8000 ? code << 1 ^ 0xCC01 : code << 1;
      crc = code & 0x1 ? crc << 1 ^ 0xCC01 : crc << 1;
    }

    table.push(crc & 0xFFFF);
  }

  return table;
}
