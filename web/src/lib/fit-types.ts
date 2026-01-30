/**
 * FIT Protocol TypeScript Types and Constants
 * Based on FIT SDK specification for cycling workouts
 */

// FIT Constants
export const FIT_HEADER_SIZE = 12;
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

// Data Type IDs (FIT Protocol Base Types)
export enum DataTypeId {
  ENUM = 0x00,
  SINT8 = 0x01,
  UINT8 = 0x02,
  SINT16 = 0x83,
  UINT16 = 0x84,
  SINT32 = 0x85,
  UINT32 = 0x86,
  STRING = 0x07,
  FLOAT32 = 0x88,
  FLOAT64 = 0x89,
  UINT8Z = 0x0A,
  UINT16Z = 0x8B,
  UINT32Z = 0x8C,
  BYTE = 0x0D,
}

// Message Types
export enum MessageType {
  FILE_ID = 0,
  WORKOUT = 26,
  WORKOUT_STEP = 27,
}

// File Types
export enum FileType {
  DEVICE = 1,
  SETTINGS = 2,
  SPORT = 3,
  ACTIVITY = 4,
  WORKOUT = 5,
  COURSE = 6,
}

// Sports
export enum Sport {
  CYCLING = 2,
}

// Intensities
export enum Intensity {
  ACTIVE = 0,
  REST = 1,
  WARMUP = 2,
  COOLDOWN = 3,
  RECOVERY = 4,
  INTERVAL = 5,
  OTHER = 6,
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
  SPEED = 0,
  HEART_RATE = 1,
  OPEN = 2,
  CADENCE = 3,
  POWER = 4,
  GRADE = 5,
  RESISTANCE = 6,
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
  customTargetPowerLow?: number;
  customTargetPowerHigh?: number;
  intensity: Intensity;
  notes?: string;
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

export function encodeString(str: string, fixedSize?: number): number[] {
  const bytes = Array.from(new TextEncoder().encode(str));
  bytes.push(0); // Null terminator required by FIT protocol

  // Pad to fixed size if specified
  if (fixedSize !== undefined) {
    while (bytes.length < fixedSize) {
      bytes.push(0);
    }
    // Truncate if too long
    if (bytes.length > fixedSize) {
      bytes.length = fixedSize;
      bytes[fixedSize - 1] = 0; // Ensure null terminator at end
    }
  }

  return bytes;
}

// CRC16 calculation for FIT protocol (taken from FIT SDK)
const CRC_TABLE = [
  0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
  0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400
];

export function calculateCrc16(data: number[]): number {
  let crc = 0;

  for (const byte of data) {
    // Compute checksum of lower four bits of byte
    let tmp = CRC_TABLE[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ CRC_TABLE[byte & 0xF];

    // Now compute checksum of upper four bits of byte
    tmp = CRC_TABLE[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ CRC_TABLE[(byte >> 4) & 0xF];
  }

  return crc;
}
