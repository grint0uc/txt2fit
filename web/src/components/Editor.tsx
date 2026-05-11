import { useWorkoutStore } from '../store/workoutStore';
import { parseWorkout } from '../lib/workout-parser';

const EXAMPLE_WORKOUT = `warmup 10min
5min 85-95% "build into it"
3x 5min 95% "threshold effort"
recovery 3min
2x 3min Z5
cooldown 8min`;

const FORMAT_GUIDE = [
  {
    category: 'Blocks',
    items: [
      { syntax: 'warmup 10min',    desc: 'Auto ramp 40→75% FTP' },
      { syntax: 'cooldown 5min',   desc: 'Auto ramp 65→40% FTP' },
      { syntax: 'recovery 3min',   desc: 'Fixed 50% FTP' },
    ],
  },
  {
    category: '% FTP',
    items: [
      { syntax: '5min 90%',        desc: 'Steady at 90% FTP' },
      { syntax: '10min 80-95%',    desc: 'Ramp from 80% to 95%' },
      { syntax: '5min 85% - 95%',  desc: 'Ramp (spaced format)' },
    ],
  },
  {
    category: 'Watts',
    items: [
      { syntax: '5min 250w',       desc: 'Steady at 250 watts' },
      { syntax: '10min 200w-300w', desc: 'Ramp 200 → 300 watts' },
    ],
  },
  {
    category: 'Zones',
    items: [
      { syntax: '5min Z3',         desc: 'Tempo (76–90% FTP)' },
      { syntax: '3min Z5',         desc: 'VO2max (106–120% FTP)' },
      { syntax: '20min zone2',     desc: 'Endurance (56–75% FTP)' },
    ],
  },
  {
    category: 'Options',
    items: [
      { syntax: '"push hard"',     desc: 'Step note (in quotes)' },
      { syntax: '3x 5min 95%',     desc: 'Repeat 3 times' },
    ],
  },
];

const ZONES_TABLE = [
  { z: 1, label: 'Active Recovery', range: '0–55%' },
  { z: 2, label: 'Endurance',       range: '56–75%' },
  { z: 3, label: 'Tempo',           range: '76–90%' },
  { z: 4, label: 'Threshold',       range: '91–105%' },
  { z: 5, label: 'VO2max',          range: '106–120%' },
  { z: 6, label: 'Anaerobic',       range: '121–150%' },
  { z: 7, label: 'Neuromuscular',   range: '150%+' },
];

export function Editor() {
  const { workoutText, setWorkoutText, setCurrentWorkout } = useWorkoutStore();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setWorkoutText(text);
    const result = parseWorkout(text);
    if (result.success && result.workout) {
      setCurrentWorkout(result.workout);
    }
  };

  const loadExample = () => {
    setWorkoutText(EXAMPLE_WORKOUT);
    const result = parseWorkout(EXAMPLE_WORKOUT);
    if (result.success && result.workout) {
      setCurrentWorkout(result.workout);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">

      {/* Textarea – top half */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-graphite-400 uppercase tracking-wider">
            Workout Script
          </label>
          <button
            onClick={loadExample}
            className="text-xs text-accent hover:text-accent-light transition-colors"
          >
            Load example
          </button>
        </div>
        <textarea
          id="workout-editor"
          value={workoutText}
          onChange={handleChange}
          placeholder={`warmup 10min\n5min 90% "threshold block"\n3x 5min 95%\ncooldown 5min`}
          className="workout-editor flex-1"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {/* Syntax reference – bottom half, 2 columns */}
      <div className="card p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
        <p className="text-xs font-semibold text-graphite-400 uppercase tracking-wider shrink-0">
          Syntax Reference
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {FORMAT_GUIDE.map(({ category, items }) => (
            <div key={category}>
              <p className="text-xs text-graphite-500 mb-1.5 font-medium">{category}</p>
              <div className="flex flex-col gap-1">
                {items.map(({ syntax, desc }) => (
                  <div key={syntax} className="flex items-baseline gap-2 text-xs">
                    <code className="text-accent font-mono shrink-0">{syntax}</code>
                    <span className="text-graphite-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Zone table spans both columns */}
          <div className="col-span-2">
            <p className="text-xs text-graphite-500 mb-1.5 font-medium">Zone Reference</p>
            <div className="grid grid-cols-7 gap-x-2 gap-y-0.5 text-xs">
              {ZONES_TABLE.map(({ z, label, range }) => (
                <div key={z} className="flex flex-col gap-0.5">
                  <span className="text-accent font-mono font-medium">Z{z}</span>
                  <span className="text-graphite-500 leading-tight" style={{ fontSize: '10px' }}>{label}</span>
                  <span className="text-graphite-600" style={{ fontSize: '10px' }}>{range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
