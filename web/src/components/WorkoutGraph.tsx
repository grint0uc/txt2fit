import { useState } from 'react';
import type { WorkoutStep } from '../types';
import { ZONE_RANGES } from '../types';

interface WorkoutGraphProps {
  steps: WorkoutStep[];
  ftp: number | null;
}

// Map % FTP to a pastel-red zone colour
const getPowerZoneColor = (powerPct: number): string => {
  if (powerPct < 56)  return '#6d7fcc'; // Z1 recovery – muted blue
  if (powerPct < 76)  return '#5bb897'; // Z2 endurance – teal
  if (powerPct < 91)  return '#d4a93a'; // Z3 tempo – amber
  if (powerPct < 106) return '#e07070'; // Z4 threshold – pastel red (accent)
  if (powerPct < 121) return '#c45c5c'; // Z5 VO2max – deeper red
  if (powerPct < 151) return '#8f3f3f'; // Z6 anaerobic – dark red
  return '#5c1f1f';                      // Z7 neuromuscular – very dark
};

export function WorkoutGraph({ steps, ftp }: WorkoutGraphProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  if (!steps || steps.length === 0) return null;

  const totalDuration = steps.reduce((sum, step) => sum + step.duration_seconds, 0);

  // Resolve each step's effective low/high % for display
  // Watts-only steps are left as 0 unless FTP is set
  const resolveStepPct = (step: WorkoutStep): { low: number; high: number } => {
    if (step.power_low_pct !== undefined) {
      return { low: step.power_low_pct, high: step.power_high_pct ?? step.power_low_pct };
    }
    if (step.power_watts !== undefined && ftp) {
      const low = Math.round((step.power_watts / ftp) * 100);
      const high = Math.round(((step.power_watts_high ?? step.power_watts) / ftp) * 100);
      return { low, high };
    }
    // Fallback: treat as ~60% so it still renders something
    if (step.power_watts !== undefined) {
      return { low: 60, high: 60 };
    }
    return { low: 0, high: 0 };
  };

  const maxPower = Math.max(
    100,
    ...steps.map((step) => {
      const { high } = resolveStepPct(step);
      return high;
    })
  );
  const maxScale = Math.ceil(maxPower / 10) * 10;

  const graphHeight = 180;
  const svgWidth = 800;

  let currentTime = 0;
  const shapes: Array<{
    path: string;
    color: string;
    step: WorkoutStep;
    idx: number;
    x: number;
    width: number;
    avgPct: number;
  }> = [];

  steps.forEach((step, idx) => {
    const startX = (currentTime / totalDuration) * svgWidth;
    const endX = ((currentTime + step.duration_seconds) / totalDuration) * svgWidth;

    const { low: lowPct, high: highPct } = resolveStepPct(step);
    const avgPct = (lowPct + highPct) / 2;

    // SVG Y: 0 = top, graphHeight = bottom
    // For ramps: left edge height = lowPct, right edge height = highPct
    const startY = graphHeight - (lowPct / maxScale) * graphHeight;
    const endY   = graphHeight - (highPct / maxScale) * graphHeight;

    // Polygon: bottom-left → top-left (at lowPct) → top-right (at highPct) → bottom-right
    const path = `M ${startX} ${graphHeight} L ${startX} ${startY} L ${endX} ${endY} L ${endX} ${graphHeight} Z`;

    shapes.push({
      path,
      color: getPowerZoneColor(avgPct),
      step,
      idx,
      x: startX,
      width: endX - startX,
      avgPct,
    });

    currentTime += step.duration_seconds;
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatStepPower = (step: WorkoutStep): string => {
    const { low, high } = resolveStepPct(step);
    const isRamp = low !== high;

    if (step.power_low_pct !== undefined) {
      if (ftp) {
        const lowW = Math.round((low / 100) * ftp);
        const highW = Math.round((high / 100) * ftp);
        if (isRamp) return `${lowW}W → ${highW}W  (${low}% → ${high}% FTP)`;
        return `${lowW}W  (${low}% FTP)`;
      }
      if (isRamp) return `${low}% → ${high}% FTP`;
      return `${low}% FTP`;
    }

    if (step.power_watts !== undefined) {
      const highW = step.power_watts_high ?? step.power_watts;
      if (isRamp || step.power_watts !== highW) {
        return `${step.power_watts}W → ${highW}W`;
      }
      return `${step.power_watts}W`;
    }

    if (step.zone !== undefined) {
      return ZONE_RANGES[step.zone]?.label ?? `Zone ${step.zone}`;
    }

    return '—';
  };

  const yLabels = [maxScale, Math.round(maxScale * 0.75), Math.round(maxScale * 0.5), Math.round(maxScale * 0.25), 0];

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-graphite-400 uppercase tracking-wider mb-3">
        Workout Profile
      </h3>

      <div className="flex gap-3">
        {/* Y-axis */}
        <div
          className="flex flex-col justify-between text-xs text-graphite-500 text-right shrink-0 w-10"
          style={{ height: graphHeight }}
        >
          {yLabels.map((v, i) => (
            <span key={i}>{v}%</span>
          ))}
        </div>

        {/* Graph area */}
        <div
          className="flex-1 relative rounded-lg overflow-hidden"
          style={{ height: graphHeight, background: '#141414' }}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <line
                key={i}
                x1="0" y1={`${fraction * 100}%`}
                x2="100%" y2={`${fraction * 100}%`}
                stroke="#272727"
                strokeWidth="1"
              />
            ))}
            {/* 100% FTP reference line */}
            <line
              x1="0" y1={`${(1 - 100 / maxScale) * 100}%`}
              x2="100%" y2={`${(1 - 100 / maxScale) * 100}%`}
              stroke="rgba(224,112,112,0.25)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          </svg>

          {/* Workout profile */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${svgWidth} ${graphHeight}`}
            preserveAspectRatio="none"
          >
            {shapes.map(({ path, color, idx }) => (
              <path
                key={idx}
                d={path}
                fill={color}
                opacity={hoveredStep === null || hoveredStep === idx ? 1 : 0.45}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="0.5"
                className="cursor-pointer transition-opacity duration-150"
                onMouseEnter={() => setHoveredStep(idx)}
                onMouseLeave={() => setHoveredStep(null)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* X-axis time markers */}
      <div className="flex gap-3 mt-1">
        <div className="w-10 shrink-0" />
        <div className="flex-1 flex justify-between text-xs text-graphite-500">
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
            <span key={i}>{formatTime(Math.round(totalDuration * f))}</span>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      <div className="mt-3 min-h-[68px]">
        {hoveredStep !== null ? (
          <div className="card p-3 border-accent/50 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="text-accent text-sm font-semibold">Step {hoveredStep + 1}</span>
              <span className="text-graphite-400 text-xs">
                {formatTime(steps[hoveredStep].duration_seconds)}
              </span>
            </div>
            <p className="text-graphite-100 text-sm font-medium">
              {formatStepPower(steps[hoveredStep])}
            </p>
            {steps[hoveredStep].notes && (
              <p className="text-accent-light text-xs italic mt-1">
                "{steps[hoveredStep].notes}"
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-graphite-600 text-xs">
            Hover over a segment to see step details
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-graphite-400">
        {[
          { color: '#6d7fcc', label: 'Z1 Recovery' },
          { color: '#5bb897', label: 'Z2 Endurance' },
          { color: '#d4a93a', label: 'Z3 Tempo' },
          { color: '#e07070', label: 'Z4 Threshold' },
          { color: '#c45c5c', label: 'Z5 VO2max' },
          { color: '#8f3f3f', label: 'Z6 Anaerobic' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
