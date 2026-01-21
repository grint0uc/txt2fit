import type { WorkoutStep } from '../types';

interface WorkoutGraphProps {
  steps: WorkoutStep[];
  ftp: number;
}

export function WorkoutGraph({ steps, ftp }: WorkoutGraphProps) {
  const totalDuration = steps.reduce((sum, step) => sum + step.duration_seconds, 0);

  // Get color based on power percentage (% FTP)
  const getPowerZoneColor = (powerPct: number): string => {
    if (powerPct < 55) return '#a78bfa'; // Light purple (recovery)
    if (powerPct < 75) return '#c084fc'; // Purple-pink (endurance)
    if (powerPct < 90) return '#e879f9'; // Light pink (tempo)
    if (powerPct < 105) return '#ff1493'; // Plasma pink (threshold)
    if (powerPct < 120) return '#ff0066'; // Hot pink (VO2max)
    return '#ff0033'; // Red (anaerobic)
  };

  // Calculate max power for scaling
  const maxPower = Math.max(
    ...steps.map((step) => {
      const high = step.power_high_pct ?? step.power_low_pct ?? 0;
      return high;
    })
  );

  const graphHeight = 200;
  const maxScale = Math.ceil(maxPower / 10) * 10; // Round up to nearest 10

  return (
    <div className="card p-4">
      <h3 className="text-sm font-bold text-carbon-300 mb-3">Workout Profile</h3>

      {/* Y-axis labels */}
      <div className="flex gap-2">
        <div className="flex flex-col justify-between text-xs text-carbon-500 w-12 text-right pr-2" style={{ height: graphHeight }}>
          <div>{maxScale}%</div>
          <div>{Math.round(maxScale * 0.75)}%</div>
          <div>{Math.round(maxScale * 0.5)}%</div>
          <div>{Math.round(maxScale * 0.25)}%</div>
          <div>0%</div>
        </div>

        {/* Graph area */}
        <div className="flex-1 relative bg-carbon-900 rounded-lg overflow-hidden" style={{ height: graphHeight }}>
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-t border-carbon-800" />
            ))}
          </div>

          {/* Step bars */}
          <div className="absolute inset-0 flex">
            {steps.map((step, idx) => {
              const width = (step.duration_seconds / totalDuration) * 100;
              const lowPct = step.power_low_pct ?? 0;
              const highPct = step.power_high_pct ?? lowPct;
              const avgPct = (lowPct + highPct) / 2;

              const color = getPowerZoneColor(avgPct);
              const heightPct = (avgPct / maxScale) * 100;

              return (
                <div
                  key={idx}
                  className="relative group cursor-default transition-opacity hover:opacity-80"
                  style={{
                    width: `${width}%`,
                    borderRight: '1px solid rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {/* Bar */}
                  <div
                    className="absolute bottom-0 w-full"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: color,
                    }}
                  />

                  {/* Tooltip */}
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-carbon-950 border border-carbon-700 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    <div className="font-bold text-carbon-200">
                      Step {idx + 1}
                    </div>
                    <div className="text-carbon-400">
                      {Math.floor(step.duration_seconds / 60)}:{(step.duration_seconds % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-carbon-300">
                      {lowPct === highPct ? (
                        <>{Math.round((lowPct / 100) * ftp)}W ({lowPct}%)</>
                      ) : (
                        <>
                          {Math.round((lowPct / 100) * ftp)}W → {Math.round((highPct / 100) * ftp)}W
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-axis (time markers) */}
      <div className="flex gap-2 mt-2">
        <div className="w-12" />
        <div className="flex-1 flex justify-between text-xs text-carbon-500">
          <div>0:00</div>
          <div>{Math.floor(totalDuration / 4 / 60)}:{((totalDuration / 4) % 60).toString().padStart(2, '0')}</div>
          <div>{Math.floor(totalDuration / 2 / 60)}:{((totalDuration / 2) % 60).toString().padStart(2, '0')}</div>
          <div>{Math.floor(totalDuration * 3 / 4 / 60)}:{((totalDuration * 3 / 4) % 60).toString().padStart(2, '0')}</div>
          <div>{Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#a78bfa' }} />
          <span className="text-carbon-400">Recovery</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#c084fc' }} />
          <span className="text-carbon-400">Endurance</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#e879f9' }} />
          <span className="text-carbon-400">Tempo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff1493' }} />
          <span className="text-carbon-400">Threshold</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff0066' }} />
          <span className="text-carbon-400">VO2max</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff0033' }} />
          <span className="text-carbon-400">Anaerobic</span>
        </div>
      </div>
    </div>
  );
}
