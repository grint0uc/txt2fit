import { useEffect } from 'react';
import { FiCheck, FiX, FiInfo } from 'react-icons/fi';
import { useUIStore } from '../store/uiStore';

export function Notifications() {
  const { notifications, removeNotification } = useUIStore();

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 pointer-events-none">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  };
  onClose: () => void;
}

function Notification({ notification, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colorMap = {
    success: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
    error: 'bg-red-500/20 border-red-500/50 text-red-300',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  };

  const iconMap = {
    success: <FiCheck size={18} />,
    error: <FiX size={18} />,
    info: <FiInfo size={18} />,
  };

  return (
    <div
      className={`pointer-events-auto animate-fade-in border rounded-lg p-4 flex items-center gap-3 max-w-sm ${colorMap[notification.type]}`}
    >
      <div className="flex-shrink-0">{iconMap[notification.type]}</div>
      <p className="text-sm font-medium">{notification.message}</p>
      <button
        onClick={onClose}
        className="ml-auto flex-shrink-0 text-current hover:opacity-70"
      >
        <FiX size={16} />
      </button>
    </div>
  );
}
