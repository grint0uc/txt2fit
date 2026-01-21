import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, showNotification } = useUIStore();
  const { setUser, setLoading, setError } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  if (!isSupabaseConfigured) {
    return (
      <Modal onClose={closeAuthModal}>
        <div className="text-center">
          <h2 className="text-xl font-bold text-carbon-100 mb-4">Authentication</h2>
          <p className="text-carbon-300 mb-6">
            Supabase is not configured yet. Auth features will be available soon.
          </p>
          <p className="text-xs text-carbon-400">
            For now, you can download workouts without an account.
          </p>
          <button
            onClick={closeAuthModal}
            className="btn-secondary mt-6"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showNotification('error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            user_metadata: data.user.user_metadata,
          });
          showNotification('success', `Welcome back, ${data.user.email}!`);
          closeAuthModal();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          showNotification('success', 'Account created! Check your email to verify.');
          setIsLogin(true);
          setPassword('');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <Modal onClose={closeAuthModal}>
      <h2 className="text-xl font-bold text-carbon-100 mb-6 text-center">
        {isLogin ? 'Login' : 'Sign Up'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-carbon-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-carbon-300 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input"
            disabled={isSubmitting}
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Loading...' : (isLogin ? 'Login' : 'Create Account')}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setPassword('');
            }}
            className="text-sm text-plasma-pink hover:text-plasma-pink-light transition"
            disabled={isSubmitting}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ onClose, children }: ModalProps) {
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-carbon-400 hover:text-carbon-100"
        >
          <FiX size={24} />
        </button>
        {children}
      </div>
    </>
  );
}
