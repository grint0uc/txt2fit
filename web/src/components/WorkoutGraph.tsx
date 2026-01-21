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
  const svgWidth = 800;

  // Build SVG path for the workout profile
  let currentTime = 0;
  const shapes: Array<{ path: string; color: string; step: WorkoutStep; idx: number; x: number; width: number }> = [];

  steps.forEach((step, idx) => {
    const startX = (currentTime / totalDuration) * svgWidth;
    const endX = ((currentTime + step.duration_seconds) / totalDuration) * svgWidth;
    const width = endX - startX;

    const lowPct = step.power_low_pct ?? 0;
    const highPct = step.power_high_pct ?? lowPct;
    const avgPct = (lowPct + highPct) / 2;

    const startY = graphHeight - (lowPct / maxScale) * graphHeight;
    const endY = graphHeight - (highPct / maxScale) * graphHeight;

    // Create polygon path: bottom-left -> top-left -> top-right -> bottom-right
    const path = `M ${startX} ${graphHeight} L ${startX} ${startY} L ${endX} ${endY} L ${endX} ${graphHeight} Z`;

    shapes.push({
      path,
      color: getPowerZoneColor(avgPct),
      step,
      idx,
      x: startX,
      width,
    });

    currentTime += step.duration_seconds;
  });

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
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <line
                key={i}
                x1="0"
                y1={graphHeight * fraction}
                x2="100%"
                y2={graphHeight * fraction}
                stroke="#1a1a1a"
                strokeWidth="1"
              />
            ))}
          </svg>

          {/* Workout profile SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${svgWidth} ${graphHeight}`} preserveAspectRatio="none">
            {shapes.map(({ path, color, step, idx, x, width }) => {
              const lowPct = step.power_low_pct ?? 0;
              const highPct = step.power_high_pct ?? lowPct;

              return (
                <g key={idx}>
                  <path
                    d={path}
                    fill={color}
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    className="transition-opacity hover:opacity-80 cursor-default"
                  />
                  {/* Invisible hover area for tooltip */}
                  <rect
                    x={x}
                    y="0"
                    width={width}
                    height={graphHeight}
                    fill="transparent"
                    className="peer cursor-default"
                  />
                  {/* Tooltip */}
                  <foreignObject
                    x={x + width / 2 - 60}
                    y="10"
                    width="120"
                    height="60"
                    className="pointer-events-none opacity-0 peer-hover:opacity-100 transition-opacity"
                  >
                    <div className="bg-carbon-950 border border-carbon-700 rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
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
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* X-axis (time markers) */}
      <div className="flex gap-2 mt-2">
        <div className="w-12" />
        <div className="flex-1 flex justify-between text-xs text-carbon-500">
          <div>0:00</div>
          <div>{Math.floor(totalDuration / 4 / 60)}:{Math.floor((totalDuration / 4) % 60).toString().padStart(2, '0')}</div>
          <div>{Math.floor(totalDuration / 2 / 60)}:{Math.floor((totalDuration / 2) % 60).toString().padStart(2, '0')}</div>
          <div>{Math.floor(totalDuration * 3 / 4 / 60)}:{Math.floor((totalDuration * 3 / 4) % 60).toString().padStart(2, '0')}</div>
          <div>{Math.floor(totalDuration / 60)}:{Math.floor(totalDuration % 60).toString().padStart(2, '0')}</div>
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
