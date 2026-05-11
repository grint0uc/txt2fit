import { useWorkoutStore } from '../store/workoutStore';
import { FiAlertCircle } from 'react-icons/fi';
import type { WorkoutStep } from '../types';
import { ZONE_RANGES } from '../types';
import { WorkoutGraph } from './WorkoutGraph';

export function Preview() {
  const { currentWorkout, ftp, max_hr, setFtp, setMaxHr } = useWorkoutStore();

  const hasSteps = currentWorkout && currentWorkout.steps.length > 0;
  const totalDuration = hasSteps
    ? currentWorkout!.steps.reduce((sum, step) => sum + step.duration_seconds, 0)
    : 0;
  const totalMinutes = Math.round(totalDuration / 60);

  const avgWatts = ftp && hasSteps
    ? Math.round(
        currentWorkout!.steps.reduce((sum, step) => {
          if (step.power_low_pct !== undefined) {
            const avg = (step.power_low_pct + (step.power_high_pct ?? step.power_low_pct)) / 2;
            return sum + (avg / 100) * ftp * step.duration_seconds;
          }
          if (step.power_watts !== undefined) {
            const avg = (step.power_watts + (step.power_watts_high ?? step.power_watts)) / 2;
            return sum + avg * step.duration_seconds;
          }
          return sum;
        }, 0) / totalDuration
      )
    : null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-graphite-100">Preview</h2>

      {/* Settings card */}
      <div className="card p-4 flex flex-col gap-3">
        <p className="text-xs font-medium text-graphite-400 uppercase tracking-wider">Settings</p>

        <div>
          <label className="block text-xs text-graphite-400 mb-1">
            FTP <span className="text-graphite-500">(watts)</span>
          </label>
          <input
            id="ftp-input"
            type="number"
            value={ftp ?? ''}
            onChange={(e) => setFtp(e.target.value ? parseInt(e.target.value) : null)}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (val && val < 50) setFtp(50);
              else if (val && val > 600) setFtp(600);
            }}
            placeholder="e.g. 250"
            className={`input ${!ftp ? 'border-accent/40' : ''}`}
            min="50"
            max="600"
          />
          {!ftp && (
            <p className="text-xs text-graphite-500 mt-1 flex items-center gap-1">
              <FiAlertCircle size={11} />
              Enter FTP to see watt values
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-graphite-400 mb-1">
            Max HR <span className="text-graphite-500">(bpm, optional)</span>
          </label>
          <input
            id="maxhr-input"
            type="number"
            value={max_hr ?? ''}
            onChange={(e) => setMaxHr(e.target.value ? parseInt(e.target.value) : null)}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (val && val < 100) setMaxHr(100);
              else if (val && val > 220) setMaxHr(220);
            }}
            placeholder="e.g. 185"
            className="input"
            min="100"
            max="220"
          />
        </div>
      </div>

      {/* Stats row – shown when steps exist */}
      {hasSteps && (
        <div className="grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <p className="text-xs text-graphite-500 mb-1">Duration</p>
            <p className="text-lg font-bold text-accent">{totalMinutes}min</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-graphite-500 mb-1">Avg Power</p>
            <p className="text-lg font-bold text-accent">
              {avgWatts ? `${avgWatts}W` : '—'}
            </p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-graphite-500 mb-1">Steps</p>
            <p className="text-lg font-bold text-accent">{currentWorkout!.steps.length}</p>
          </div>
        </div>
      )}

      {/* Graph – always shown when steps exist (FTP optional) */}
      {hasSteps && (
        <WorkoutGraph steps={currentWorkout!.steps} ftp={ftp} />
      )}

      {/* Step list */}
      {hasSteps ? (
        <div className="flex flex-col gap-2">
          {currentWorkout!.steps.map((step, idx) => (
            <StepRow key={idx} step={step} index={idx + 1} ftp={ftp} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-graphite-600 text-sm">
          No workout yet — start typing in the editor
        </div>
      )}
    </div>
  );
}

interface StepRowProps {
  step: WorkoutStep;
  index: number;
  ftp: number | null;
}

function StepRow({ step, index, ftp }: StepRowProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}min`;
  };

  const formatPower = (): string => {
    // % FTP
    if (step.power_low_pct !== undefined) {
      const low = step.power_low_pct;
      const high = step.power_high_pct ?? low;
      const isRamp = low !== high;
      if (ftp) {
        const lowW = Math.round((low / 100) * ftp);
        const highW = Math.round((high / 100) * ftp);
        if (isRamp) return `${lowW}W → ${highW}W (${low}% → ${high}% FTP)`;
        return `${lowW}W (${low}% FTP)`;
      }
      if (isRamp) return `${low}% → ${high}% FTP`;
      return `${low}% FTP`;
    }
    // Absolute watts
    if (step.power_watts !== undefined) {
      const highW = step.power_watts_high ?? step.power_watts;
      if (step.power_watts !== highW) return `${step.power_watts}W → ${highW}W`;
      return `${step.power_watts}W`;
    }
    // Zone
    if (step.zone !== undefined) {
      const zr = ZONE_RANGES[step.zone];
      return zr ? `${zr.label} (${zr.low}–${zr.high}% FTP)` : `Zone ${step.zone}`;
    }
    return '—';
  };

  const stepTypeColors: Record<string, string> = {
    WARMUP:   'text-sky-400',
    COOLDOWN: 'text-sky-400',
    RECOVERY: 'text-emerald-400',
    RAMP:     'text-accent-light',
    STEADY:   'text-graphite-200',
  };

  const typeColor = stepTypeColors[step.step_type] || 'text-graphite-200';

  const stepTypeLabel: Record<string, string> = {
    WARMUP:   'Warmup',
    COOLDOWN: 'Cooldown',
    RECOVERY: 'Recovery',
    RAMP:     'Ramp',
    STEADY:   'Steady',
  };

  return (
    <div className="card p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-graphite-500 text-xs">#{index}</span>
            <span className={`text-xs font-medium ${typeColor}`}>
              {stepTypeLabel[step.step_type] || step.step_type}
            </span>
            <span className="text-graphite-400 text-xs">
              {formatDuration(step.duration_seconds)}
            </span>
          </div>
          <p className="text-graphite-200 text-xs truncate">{formatPower()}</p>
          {step.notes && (
            <p className="text-accent-light text-xs italic mt-0.5 truncate">"{step.notes}"</p>
          )}
        </div>
      </div>
    </div>
  );
}
