import type { Workout, WorkoutStep } from '../types';
import { StepType } from '../types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pct(value: number): string {
  return (value / 100).toFixed(3);
}

function element(
  tag: string,
  attrs: Record<string, string | number>,
  note?: string
): string {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  if (note) {
    return (
      `        <${tag} ${attrStr}>\n` +
      `            <textevent timeoffset="0" message="${escapeXml(note)}"/>\n` +
      `        </${tag}>`
    );
  }
  return `        <${tag} ${attrStr}/>`;
}

function stepToZwo(step: WorkoutStep, ftp: number): string {
  const dur = Math.round(step.duration_seconds);
  const note = step.notes;

  // Resolve power as percentages
  let low: number | undefined;
  let high: number | undefined;

  if (step.power_low_pct !== undefined) {
    low  = step.power_low_pct;
    high = step.power_high_pct ?? step.power_low_pct;
  } else if (step.power_watts !== undefined && ftp > 0) {
    low  = Math.round((step.power_watts / ftp) * 100);
    high = Math.round(((step.power_watts_high ?? step.power_watts) / ftp) * 100);
  }

  // No power target → FreeRide
  if (low === undefined) {
    return element('FreeRide', { Duration: dur }, note);
  }

  switch (step.step_type) {
    case StepType.WARMUP:
      return element('Warmup', {
        Duration: dur,
        PowerLow:  pct(Math.min(low, high!)),
        PowerHigh: pct(Math.max(low, high!)),
      }, note);

    case StepType.COOLDOWN:
      // Parser stores cooldown as power_low_pct=start(65), power_high_pct=end(40)
      // ZWO Cooldown: PowerLow = start (numerically higher), PowerHigh = end (lower)
      return element('Cooldown', {
        Duration:  dur,
        PowerLow:  pct(low),
        PowerHigh: pct(high!),
      }, note);

    case StepType.RAMP:
      if (low <= high!) {
        // Ascending ramp
        return element('Ramp', {
          Duration:  dur,
          PowerLow:  pct(low),
          PowerHigh: pct(high!),
        }, note);
      } else {
        // Descending ramp → Cooldown element
        return element('Cooldown', {
          Duration:  dur,
          PowerLow:  pct(low),
          PowerHigh: pct(high!),
        }, note);
      }

    default:
      // STEADY, RECOVERY, or anything else
      return element('SteadyState', { Duration: dur, Power: pct(low) }, note);
  }
}

export function generateZwoFile(workout: Workout, ftp: number): string {
  const name = escapeXml(workout.name || 'Workout');
  const steps = workout.steps.map((s) => stepToZwo(s, ftp)).join('\n');

  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<workout_file>\n` +
    `    <author></author>\n` +
    `    <name>${name}</name>\n` +
    `    <description></description>\n` +
    `    <sportType>bike</sportType>\n` +
    `    <tags></tags>\n` +
    `    <workout>\n` +
    `${steps}\n` +
    `    </workout>\n` +
    `</workout_file>`
  );
}
