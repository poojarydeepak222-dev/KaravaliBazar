import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const ForumVisibilityController = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'forum_enabled').maybeSingle();
      if (mounted) setEnabled(data?.value !== 'false');
    };
    load();
    const timer = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  if (pathname !== '/' || !enabled) return null;

  return (
    <button
      onClick={() => navigate('/login')}
      className="fixed bottom-[88px] right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg active:scale-95 transition-transform"
      aria-label="Open Forum"
    >
      <MessageSquare size={16} />
      Forum
    </button>
  );
};

export default ForumVisibilityController;
