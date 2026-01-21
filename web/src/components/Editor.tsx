import { useWorkoutStore } from '../store/workoutStore';
import { parseWorkout } from '../lib/workout-parser';
import type { Workout } from '../types';

export function Editor() {
  const { workoutText, setWorkoutText, setCurrentWorkout } = useWorkoutStore();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setWorkoutText(text);

    // Parse and update workout in real-time
    const result = parseWorkout(text);
    if (result.success && result.workout) {
      setCurrentWorkout(result.workout);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        <label className="text-sm font-medium text-carbon-300 mb-2">
          Workout Text
        </label>
        <textarea
          value={workoutText}
          onChange={handleChange}
          placeholder="warmup 10min&#10;3x 5min 95% FTP @90rpm&#10;cooldown 5min"
          className="input flex-1 font-mono text-sm resize-none"
          spellCheck="false"
        />
      </div>

      <div className="mt-4 p-3 bg-carbon-800 rounded-lg border border-carbon-700">
        <p className="text-xs text-carbon-400 mb-2 font-medium">Format Guide:</p>
        <ul className="text-xs text-carbon-300 space-y-1 font-mono">
          <li>• <span className="text-plasma-pink">10min</span> - Duration (s, min, h)</li>
          <li>• <span className="text-plasma-pink">90% FTP</span> - Power target</li>
          <li>• <span className="text-plasma-pink">85-95% FTP</span> - Power range</li>
          <li>• <span className="text-plasma-pink">@90rpm</span> - Cadence target</li>
          <li>• <span className="text-plasma-pink">"note"</span> - Step instructions</li>
          <li>• <span className="text-plasma-pink">3x 5min</span> - Repeat 3 times</li>
          <li>• <span className="text-plasma-pink">warmup, cooldown, recovery</span> - Special blocks</li>
        </ul>
      </div>
    </div>
  );
}
