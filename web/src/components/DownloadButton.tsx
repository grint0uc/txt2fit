import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useWorkoutStore } from '../store/workoutStore';
import { useUIStore } from '../store/uiStore';
import { generateFitFile } from '../lib/fit-generator';
import { generateZwoFile } from '../lib/zwo-generator';
import { parseWorkout } from '../lib/workout-parser';

const ZWO_DEVICES = 'Hammerhead Karoo · Zwift · TrainerRoad · Rouvy · FulGaz · Wahoo SYSTM';
const FIT_DEVICES = 'Garmin Edge · Wahoo ELEMNT/BOLT · Hammerhead Karoo · Bryton · Polar';

export function DownloadButton() {
  const { currentWorkout, workoutText, ftp } = useWorkoutStore();
  const { showNotification } = useUIStore();
  const [loadingFit, setLoadingFit] = useState(false);
  const [loadingZwo, setLoadingZwo] = useState(false);

  const isReady = !!(currentWorkout && currentWorkout.steps.length > 0);
  const hasFtp  = !!ftp;

  const triggerDownload = (data: BlobPart, mime: string, filename: string) => {
    const blob = new Blob([data], { type: mime });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const timestamp = () =>
    new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

  // Always re-parse from text so cached state (localStorage) never carries stale metadata
  const freshWorkout = () => {
    const result = parseWorkout(workoutText);
    return result.success ? result.workout! : currentWorkout!;
  };

  const handleZwo = async () => {
    if (!hasFtp) { showNotification('error', 'Please set your FTP value first'); return; }
    if (!isReady) { showNotification('error', 'Please create a valid workout first'); return; }
    setLoadingZwo(true);
    try {
      const workout  = freshWorkout();
      const xml      = generateZwoFile({ ...workout, ftp: ftp! }, ftp!);
      const filename = `${(workout.name || 'Workout').replace(/\s+/g, '_')}_${timestamp()}.zwo`;
      triggerDownload(xml, 'application/xml', filename);
      showNotification('success', `Downloaded: ${filename}`);
    } catch (e) {
      console.error(e);
      showNotification('error', 'Failed to generate ZWO file');
    } finally {
      setLoadingZwo(false);
    }
  };

  const handleFit = async () => {
    if (!hasFtp) { showNotification('error', 'Please set your FTP value first'); return; }
    if (!isReady) { showNotification('error', 'Please create a valid workout first'); return; }
    setLoadingFit(true);
    try {
      const workout  = freshWorkout();
      const data     = generateFitFile({ ...workout, ftp: ftp! }) as unknown as BlobPart;
      const filename = `${(workout.name || 'Workout').replace(/\s+/g, '_')}_${timestamp()}.fit`;
      triggerDownload(data, 'application/octet-stream', filename);
      showNotification('success', `Downloaded: ${filename}`);
    } catch (e) {
      console.error(e);
      showNotification('error', 'Failed to generate FIT file');
    } finally {
      setLoadingFit(false);
    }
  };

  const disabled = !isReady || !hasFtp;
  const disabledTitle = 'Set your FTP value to enable download';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {/* ZWO — primary, recommended */}
        <div className="flex flex-col gap-0.5 flex-1">
          <button
            id="download-zwo-btn"
            onClick={handleZwo}
            disabled={disabled || loadingZwo}
            title={disabled ? disabledTitle : `Indoor training platforms & smart computers · ${ZWO_DEVICES}`}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FiDownload size={15} />
            {loadingZwo ? 'Generating…' : 'Download .ZWO'}
          </button>
          <p className="text-[10px] text-graphite-400 leading-tight px-0.5">
            Indoor platforms · ramps &amp; repeats
          </p>
          <p className="text-[10px] text-graphite-500 leading-tight px-0.5">
            {ZWO_DEVICES}
          </p>
        </div>

        {/* FIT — secondary, universal fallback */}
        <div className="flex flex-col gap-0.5 flex-1">
          <button
            id="download-fit-btn"
            onClick={handleFit}
            disabled={disabled || loadingFit}
            title={disabled ? disabledTitle : `Universal binary format · ${FIT_DEVICES}`}
            className="btn-secondary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FiDownload size={15} />
            {loadingFit ? 'Generating…' : 'Download .FIT'}
          </button>
          <p className="text-[10px] text-graphite-400 leading-tight px-0.5">
            Universal · ramps stored as ranges
          </p>
          <p className="text-[10px] text-graphite-500 leading-tight px-0.5">
            {FIT_DEVICES}
          </p>
        </div>
      </div>
    </div>
  );
}
