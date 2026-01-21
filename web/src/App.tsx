import { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { AuthModal } from './components/AuthModal';
import { Notifications } from './components/Notifications';
import { useAuthStore } from './store/authStore';
import { supabase, isSupabaseConfigured } from './lib/supabase';

function App() {
  const { setUser } = useAuthStore();

  useEffect(() => {
    // Check for existing session on mount
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata,
          });
        }
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata,
          });
        }
      });

      return () => subscription?.unsubscribe();
    }
  }, [setUser]);

  return (
    <div className="flex flex-col h-screen bg-carbon-950">
      <Navbar />

      <main className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col border-r border-carbon-800 overflow-hidden">
          <div className="max-w-4xl mx-auto w-full h-full p-6 flex flex-col">
            <Editor />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-[600px] border-l border-carbon-800 overflow-hidden">
          <div className="h-full p-6 overflow-y-auto">
            <Preview />
          </div>
        </div>
      </main>

      {/* Modals and Notifications */}
      <AuthModal />
      <Notifications />
    </div>
  );
}

export default App;
