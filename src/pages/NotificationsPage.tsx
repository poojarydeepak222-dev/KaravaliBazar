import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Info, AlertCircle, CheckCircle2, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/layout/BottomNav';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof Info; color: string; bg: string; border: string }> = {
  info:    { icon: Info,         color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  success: { icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  warning: { icon: AlertCircle,  color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  alert:   { icon: Megaphone,    color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem('kb_read_notifs');
    const rs = new Set<string>(stored ? JSON.parse(stored) : []);
    setReadIds(rs);

    supabase.from('notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setNotifications(data);
          // Mark all as read
          const allIds = data.map((n: Notification) => n.id);
          const newReadIds = new Set([...Array.from(rs), ...allIds]);
          setReadIds(newReadIds);
          localStorage.setItem('kb_read_notifs', JSON.stringify(Array.from(newReadIds)));
        }
        setLoading(false);
      });
  }, []);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={24} /></button>
          <div className="flex-1">
            <p className="text-white font-black text-xl">Notifications</p>
            <p className="text-white/70 text-xs">{notifications.length} messages</p>
          </div>
          <Bell size={22} className="text-white/70" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <Bell size={36} className="text-orange-300" />
          </div>
          <p className="font-black text-gray-700 text-lg">No Notifications</p>
          <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {notifications.map(n => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            const IconComp = cfg.icon;
            const isUnread = !readIds.has(n.id);
            return (
              <div key={n.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${isUnread ? 'border-orange-200' : 'border-gray-100'}`}>
                {isUnread && <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #FF6B1A, #FF1D78)' }} />}
                <div className="p-4 flex gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
                    <IconComp size={20} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-black text-gray-800 text-sm leading-tight">{n.title}</p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">{formatTime(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
