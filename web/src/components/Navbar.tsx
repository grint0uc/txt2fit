import { FiLogIn, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { DownloadButton } from './DownloadButton';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { openAuthModal } = useUIStore();

  return (
    <nav className="border-b border-carbon-800 bg-carbon-900 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-plasma-pink to-plasma-pink-dark rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">≈</span>
          </div>
          <h1 className="text-xl font-bold text-white">
            txt2fit
          </h1>
          <span className="text-xs text-carbon-400 ml-2">beta</span>
        </div>

        {/* Center - Download button */}
        <div className="flex-1 flex justify-center">
          <DownloadButton />
        </div>

        {/* Right - Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-carbon-300">
                <FiUser size={16} />
                <span className="hidden sm:inline">{user.email}</span>
              </div>
              <button
                onClick={() => logout()}
                className="btn-ghost flex items-center gap-2 text-sm"
              >
                <FiLogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => openAuthModal()}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FiLogIn size={16} />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
