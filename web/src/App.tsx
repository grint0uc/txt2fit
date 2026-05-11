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
    <div className="flex flex-col h-screen bg-graphite-900 overflow-hidden">
      <Navbar />

      <main className="flex-1 flex overflow-hidden">
        {/* Editor panel – 55% */}
        <div className="flex-[55] min-w-0 flex flex-col border-r border-graphite-700 overflow-hidden">
          <div className="h-full p-5 flex flex-col overflow-y-auto">
            <Editor />
          </div>
        </div>

        {/* Preview panel – 45% */}
        <div className="flex-[45] min-w-0 border-l border-graphite-700 overflow-hidden">
          <div className="h-full p-5 overflow-y-auto">
            <Preview />
          </div>
        </div>
      </main>

      <AuthModal />
      <Notifications />
    </div>
  );
}

export default App;
