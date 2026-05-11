import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useWorkoutStore } from '../store/workoutStore';
import { useUIStore } from '../store/uiStore';
import { generateFitFile } from '../lib/fit-generator';

export function DownloadButton() {
  const { currentWorkout, ftp } = useWorkoutStore();
  const { showNotification } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!ftp) {
      showNotification('error', 'Please set your FTP value first');
      return;
    }

    if (!currentWorkout || currentWorkout.steps.length === 0) {
      showNotification('error', 'Please create a valid workout first');
      return;
    }

    setIsLoading(true);

    try {
      const fitData = generateFitFile(currentWorkout);

      const blob = new Blob([fitData as BlobPart], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `${(currentWorkout.name || 'workout').replace(/\s+/g, '_')}_${timestamp}.fit`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification('success', `Downloaded: ${link.download}`);
    } catch (error) {
      console.error('Download error:', error);
      showNotification('error', 'Failed to generate FIT file');
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || !ftp || !currentWorkout || currentWorkout.steps.length === 0;

  return (
    <button
      id="download-fit-btn"
      onClick={handleDownload}
      disabled={isDisabled}
      title={!ftp ? 'Set your FTP value to enable download' : 'Download as .FIT file'}
      className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <FiDownload size={15} />
      {isLoading ? 'Generating…' : 'Download .FIT'}
    </button>
  );
}
