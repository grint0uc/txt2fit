import { useWorkoutStore } from '../store/workoutStore';
import { FiAlertCircle } from 'react-icons/fi';
import type { WorkoutStep } from '../types';

export function Preview() {
  const { currentWorkout, ftp, max_hr, setFtp, setMaxHr } = useWorkoutStore();

  if (!currentWorkout || currentWorkout.steps.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-bold text-carbon-300 mb-4">Settings & Preview</h2>

        {/* FTP/Max HR Settings */}
        <div className="card p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-carbon-400 mb-1">
              FTP (watts) <span className="text-plasma-pink">*</span>
            </label>
            <input
              type="number"
              value={ftp ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setFtp(val ? parseInt(val) : null);
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value);
                if (val && val < 50) {
                  setFtp(50);
                } else if (val && val > 500) {
                  setFtp(500);
                }
              }}
              placeholder="e.g. 250"
              className={`input text-sm ${!ftp ? 'border-red-500' : ''}`}
              min="50"
              max="500"
            />
            {!ftp && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <FiAlertCircle size={12} /> FTP is required
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-carbon-400 mb-1">
              Max HR (bpm)
            </label>
            <input
              type="number"
              value={max_hr ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setMaxHr(val ? parseInt(val) : null);
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value);
                if (val && val < 100) {
                  setMaxHr(100);
                } else if (val && val > 220) {
                  setMaxHr(220);
                }
              }}
              placeholder="e.g. 185"
              className="input text-sm"
              min="100"
              max="220"
            />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center text-carbon-500 text-sm">
          No workout parsed yet. Edit the text to see preview.
        </div>
      </div>
    );
  }

  const totalDuration = currentWorkout.steps.reduce((sum, step) => sum + step.duration_seconds, 0);
  const totalMinutes = Math.round(totalDuration / 60);

  // Only calculate watts if FTP is set
  const totalWatts = ftp ? currentWorkout.steps.reduce((sum, step) => {
    if (step.power_low_pct !== undefined) {
      return sum + ((step.power_low_pct + (step.power_high_pct || step.power_low_pct)) / 2 / 100) * ftp * step.duration_seconds;
    }
    return sum;
  }, 0) : 0;
  const avgWatts = totalDuration > 0 && ftp ? Math.round(totalWatts / totalDuration) : 0;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}min`;
  };

  const formatPower = (pct: number | undefined): string => {
    if (pct === undefined || !ftp) return '—';
    return `${Math.round((pct / 100) * ftp)}W (${pct}%)`;
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold text-carbon-100 mb-4">Workout Preview</h2>

      {/* FTP/Max HR Settings */}
      <div className="card p-3 mb-4 space-y-2">
        <div>
          <label className="block text-xs font-medium text-carbon-400 mb-1">
            FTP (watts) <span className="text-plasma-pink">*</span>
          </label>
          <input
            type="number"
            value={ftp ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setFtp(val ? parseInt(val) : null);
            }}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (val && val < 50) {
                setFtp(50);
              } else if (val && val > 500) {
                setFtp(500);
              }
            }}
            placeholder="e.g. 250"
            className={`input text-sm ${!ftp ? 'border-red-500' : ''}`}
            min="50"
            max="500"
          />
          {!ftp && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <FiAlertCircle size={12} /> FTP is required to calculate power
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-carbon-400 mb-1">
            Max HR (bpm)
          </label>
          <input
            type="number"
            value={max_hr ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setMaxHr(val ? parseInt(val) : null);
            }}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (val && val < 100) {
                setMaxHr(100);
              } else if (val && val > 220) {
                setMaxHr(220);
              }
            }}
            placeholder="e.g. 185"
            className="input text-sm"
            min="100"
            max="220"
          />
        </div>
      </div>

      {/* Warning if FTP is not set */}
      {!ftp && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 flex items-start gap-2">
          <FiAlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-medium text-red-300">FTP Required</p>
            <p className="text-xs text-red-200">Set your FTP value above to see power calculations</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {ftp && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="card p-3 text-center">
              <p className="text-xs text-carbon-400">Duration</p>
              <p className="text-lg font-bold text-plasma-pink">{totalMinutes}min</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xs text-carbon-400">Avg Power</p>
              <p className="text-lg font-bold text-plasma-pink">{avgWatts}W</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xs text-carbon-400">Steps</p>
              <p className="text-lg font-bold text-plasma-pink">{currentWorkout.steps.length}</p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {currentWorkout.steps.map((step, idx) => (
              <StepRow key={idx} step={step} index={idx + 1} ftp={ftp} />
            ))}
          </div>
        </>
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

  const formatPower = (pct: number | undefined): string => {
    if (pct === undefined) return '—';
    const watts = Math.round((pct / 100) * ftp);
    return `${watts}W (${pct}%)`;
  };

  const intensityColors: { [key: string]: string } = {
    WARMUP: 'text-blue-400',
    ACTIVE: 'text-carbon-300',
    REST: 'text-emerald-400',
    INTERVAL: 'text-plasma-pink',
  };

  const intensityColor = intensityColors[step.intensity?.toString() || 'ACTIVE'] || 'text-carbon-300';

  return (
    <div className="card p-3 text-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className={`font-bold ${intensityColor}`}>
            Step {index} • {formatDuration(step.duration_seconds)}
          </div>
          <div className="text-carbon-400 text-xs mt-1">
            Power: {formatPower(step.power_low_pct === step.power_high_pct ? step.power_low_pct : undefined)}
            {step.power_low_pct !== step.power_high_pct && ` (${step.power_low_pct}% - ${step.power_high_pct}%)`}
          </div>
          {(step.cadence_low || step.cadence_high) && (
            <div className="text-carbon-400 text-xs">
              Cadence: {step.cadence_low}
              {step.cadence_high && step.cadence_low !== step.cadence_high ? `–${step.cadence_high}` : ''} RPM
            </div>
          )}
          {step.notes && (
            <div className="text-plasma-pink-light text-xs italic mt-1">
              "{step.notes}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
