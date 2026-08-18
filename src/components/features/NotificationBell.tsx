import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('kb_read_notifs');
    const readSet = new Set<string>(stored ? JSON.parse(stored) : []);

    supabase.from('notifications')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setUnread(data.filter(n => !readSet.has(n.id)).length);
        }
      });

    // Poll every 30s
    const t = setInterval(() => {
      const s = localStorage.getItem('kb_read_notifs');
      const rs = new Set<string>(s ? JSON.parse(s) : []);
      supabase.from('notifications').select('id').eq('is_active', true).limit(50)
        .then(({ data }) => { if (data) setUnread(data.filter(n => !rs.has(n.id)).length); });
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const handleClick = () => navigate('/notifications');

  return (
    <button onClick={handleClick} className="relative text-white p-1">
      <Bell size={22} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
