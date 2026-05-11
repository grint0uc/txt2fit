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

function resolveSteadyPct(step: WorkoutStep, ftp: number): number | undefined {
  if (step.power_low_pct !== undefined) {
    if (step.power_low_pct !== step.power_high_pct) return undefined; // ramp
    return step.power_low_pct;
  }
  if (step.power_watts !== undefined && ftp > 0) {
    if (step.power_watts !== (step.power_watts_high ?? step.power_watts)) return undefined; // ramp
    return Math.round((step.power_watts / ftp) * 100);
  }
  return undefined;
}

function tryIntervalsT(
  on: WorkoutStep,
  off: WorkoutStep,
  repeat: number,
  ftp: number
): string | null {
  const onPct  = resolveSteadyPct(on, ftp);
  const offPct = resolveSteadyPct(off, ftp);
  if (onPct === undefined || offPct === undefined) return null;

  const onDur  = Math.round(on.duration_seconds);
  const offDur = Math.round(off.duration_seconds);
  const attrs = {
    Repeat:      repeat,
    OnDuration:  onDur,
    OffDuration: offDur,
    OnPower:     pct(onPct),
    OffPower:    pct(offPct),
  };
  const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');

  if (on.notes) {
    return (
      `        <IntervalsT ${attrStr}>\n` +
      `            <textevent timeoffset="0" message="${escapeXml(on.notes)}"/>\n` +
      `        </IntervalsT>`
    );
  }
  return `        <IntervalsT ${attrStr}/>`;
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
      return element('Cooldown', {
        Duration:  dur,
        PowerLow:  pct(low),
        PowerHigh: pct(high!),
      }, note);

    case StepType.RAMP:
      if (low <= high!) {
        return element('Ramp', {
          Duration:  dur,
          PowerLow:  pct(low),
          PowerHigh: pct(high!),
        }, note);
      } else {
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
  const parts: string[] = [];

  const consumed = new Set<number>();
  const triedGroups = new Set<number>();

  for (let i = 0; i < workout.steps.length; i++) {
    if (consumed.has(i)) continue;

    const step = workout.steps[i];

    // Attempt to collapse 2-step repeat groups into IntervalsT
    if (
      step._repeatId !== undefined &&
      step._repeatStep === 0 &&
      !triedGroups.has(step._repeatId)
    ) {
      triedGroups.add(step._repeatId);
      const size  = step._repeatSize!;
      const count = step._repeatCount!;

      if (size === 2) {
        const cycle = workout.steps.slice(i, i + size);
        const intervalsT = tryIntervalsT(cycle[0], cycle[1], count, ftp);
        if (intervalsT) {
          parts.push(intervalsT);
          for (let j = i; j < i + size * count; j++) consumed.add(j);
          continue;
        }
      }
    }

    parts.push(stepToZwo(step, ftp));
  }

  const steps = parts.join('\n');

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
