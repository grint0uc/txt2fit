import { useState } from 'react';
import { useWorkoutStore } from '../store/workoutStore';
import { parseWorkout } from '../lib/workout-parser';

const EXAMPLE_WORKOUT = `warmup 10min
5min 85-95% "build into it"
3x (5min 95%, 3min 55%) "threshold intervals"
recovery 3min
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
    ],
  },
  {
    category: 'Options',
    items: [
      { syntax: '"push hard"',              desc: 'Step note (quoted)' },
      { syntax: '3x 5min 95%',             desc: 'Repeat one step' },
      { syntax: '3x (5min 95%, 2min 55%)', desc: 'Repeat a block' },
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

const FORMAT_CARDS = [
  {
    id: 'zwo',
    ext: '.ZWO',
    badge: 'Recommended',
    badgeColor: 'text-accent bg-accent/10',
    headline: 'Zwift Workout XML',
    description: 'Open XML format used by indoor training platforms and smart cycling computers. Encodes warmup, cooldown, steady-state, ramps, and repeating interval blocks natively.',
    pros: [
      'Warmup, cooldown and ramp steps render correctly',
      'Repeating blocks shown as a single compact interval',
      'Human-readable — can be edited in any text editor',
    ],
    note: null,
    devices: ['Hammerhead Karoo', 'Zwift', 'TrainerRoad', 'Rouvy', 'FulGaz', 'Wahoo SYSTM'],
  },
  {
    id: 'fit',
    ext: '.FIT',
    badge: 'Universal',
    badgeColor: 'text-graphite-300 bg-graphite-700',
    headline: 'Garmin FIT Binary',
    description: 'The industry-standard binary format supported by virtually every cycling computer and smart trainer. Steps are stored as power ranges — ramp direction is encoded separately and may not be visualised on all devices.',
    pros: [
      'Supported by every major cycling computer',
      'Works with ANT+ FE-C and Bluetooth smart trainers',
      'No companion app required',
    ],
    note: 'Ramp steps are stored as a low–high power range. Exact visual rendering depends on the device.',
    devices: ['Garmin Edge (all models)', 'Wahoo ELEMNT / BOLT / ROAM', 'Hammerhead Karoo', 'Bryton', 'Polar', 'ANT+ FE-C trainers'],
  },
];

export function Editor() {
  const { workoutText, setWorkoutText, setCurrentWorkout } = useWorkoutStore();
  const [tab, setTab] = useState<'syntax' | 'formats'>('syntax');

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

      {/* Textarea */}
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
          placeholder={`warmup 10min\n5min 90% "threshold block"\n3x (5min 95%, 2min 55%)\ncooldown 5min`}
          className="workout-editor flex-1"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {/* Reference card with tabs */}
      <div className="card flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-graphite-800 shrink-0">
          {(['syntax', 'formats'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors',
                tab === t
                  ? 'text-accent border-b-2 border-accent -mb-px'
                  : 'text-graphite-500 hover:text-graphite-300',
              ].join(' ')}
            >
              {t === 'syntax' ? 'Syntax' : 'Formats & Devices'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">

          {tab === 'syntax' && (
            <div className="flex flex-col gap-4">
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
          )}

          {tab === 'formats' && (
            <div className="flex flex-col gap-4">
              {FORMAT_CARDS.map(({ id, ext, badge, badgeColor, headline, description, pros, note, devices }) => (
                <div key={id} className="rounded-lg border border-graphite-800 p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-graphite-100">{ext}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeColor}`}>{badge}</span>
                  </div>

                  <p className="text-xs font-medium text-graphite-300">{headline}</p>
                  <p className="text-xs text-graphite-500 leading-relaxed">{description}</p>

                  <ul className="flex flex-col gap-0.5">
                    {pros.map((p) => (
                      <li key={p} className="text-xs text-graphite-400 flex gap-1.5">
                        <span className="text-accent shrink-0">·</span>
                        {p}
                      </li>
                    ))}
                  </ul>

                  {note && (
                    <p className="text-[11px] text-graphite-600 border-l-2 border-graphite-700 pl-2 leading-tight">
                      {note}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {devices.map((d) => (
                      <span key={d} className="text-[10px] bg-graphite-800 text-graphite-400 px-1.5 py-0.5 rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
