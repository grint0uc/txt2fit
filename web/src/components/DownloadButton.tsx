import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useWorkoutStore } from '../store/workoutStore';
import { useUIStore } from '../store/uiStore';
import { generateFitFile } from '../lib/fit-generator';
import { generateZwoFile } from '../lib/zwo-generator';

export function DownloadButton() {
  const { currentWorkout, ftp } = useWorkoutStore();
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

  const handleFit = async () => {
    if (!hasFtp) { showNotification('error', 'Please set your FTP value first'); return; }
    if (!isReady) { showNotification('error', 'Please create a valid workout first'); return; }
    setLoadingFit(true);
    try {
      const data     = generateFitFile({ ...currentWorkout!, ftp: ftp! }) as unknown as BlobPart;
      const filename = `${(currentWorkout!.name || 'Workout').replace(/\s+/g, '_')}_${timestamp()}.fit`;
      triggerDownload(data, 'application/octet-stream', filename);
      showNotification('success', `Downloaded: ${filename}`);
    } catch (e) {
      console.error(e);
      showNotification('error', 'Failed to generate FIT file');
    } finally {
      setLoadingFit(false);
    }
  };

  const handleZwo = async () => {
    if (!hasFtp) { showNotification('error', 'Please set your FTP value first'); return; }
    if (!isReady) { showNotification('error', 'Please create a valid workout first'); return; }
    setLoadingZwo(true);
    try {
      const xml      = generateZwoFile({ ...currentWorkout!, ftp: ftp! }, ftp!);
      const filename = `${(currentWorkout!.name || 'Workout').replace(/\s+/g, '_')}_${timestamp()}.zwo`;
      triggerDownload(xml, 'application/xml', filename);
      showNotification('success', `Downloaded: ${filename}`);
    } catch (e) {
      console.error(e);
      showNotification('error', 'Failed to generate ZWO file');
    } finally {
      setLoadingZwo(false);
    }
  };

  const disabled = !isReady || !hasFtp;
  const title    = !hasFtp ? 'Set your FTP value to enable download' : undefined;

  return (
    <div className="flex gap-2">
      <button
        id="download-fit-btn"
        onClick={handleFit}
        disabled={disabled || loadingFit}
        title={title ?? 'Download as .FIT (Garmin, Wahoo, Hammerhead)'}
        className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiDownload size={15} />
        {loadingFit ? 'Generating…' : 'Download .FIT'}
      </button>

      <button
        id="download-zwo-btn"
        onClick={handleZwo}
        disabled={disabled || loadingZwo}
        title={title ?? 'Download as .ZWO (Zwift, Hammerhead)'}
        className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiDownload size={15} />
        {loadingZwo ? 'Generating…' : 'Download .ZWO'}
      </button>
    </div>
  );
}
