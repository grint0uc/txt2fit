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
      // Generate FIT file
      const fitData = generateFitFile(currentWorkout);

      // Debug: Log first 100 bytes
      const debugHex = Array.from(fitData.slice(0, 100))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      console.log(`Generated ${fitData.length} bytes`);
      console.log(`First 100 bytes: ${debugHex}`);

      // Create blob and download
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
      onClick={handleDownload}
      disabled={isDisabled}
      title={!ftp ? 'Set FTP value to download' : ''}
      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FiDownload size={18} />
      {isLoading ? 'Generating...' : 'Download .FIT'}
    </button>
  );
}
