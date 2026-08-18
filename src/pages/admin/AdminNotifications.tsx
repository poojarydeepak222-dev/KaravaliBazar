import { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, Info, AlertCircle, CheckCircle2, Megaphone, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

const TYPE_OPTIONS = [
  { id: 'info', label: 'Info', icon: Info, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'success', label: 'Success', icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
  { id: 'warning', label: 'Warning', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 'alert', label: 'Alert', icon: Megaphone, color: 'text-orange-600 bg-orange-50 border-orange-200' },
];

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info' });
  const [saving, setSaving] = useState(false);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message required');
    setSaving(true);
    const { error } = await supabase.from('notifications').insert({
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type,
      is_active: true,
    });
    setSaving(false);
    if (error) return toast.error('Failed to send notification');
    toast.success('Notification sent to all users!');
    setForm({ title: '', message: '', type: 'info' });
    setShowForm(false);
    fetchNotifications();
  };

  const toggleActive = async (n: Notification) => {
    await supabase.from('notifications').update({ is_active: !n.is_active }).eq('id', n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_active: !x.is_active } : x));
    toast.success(n.is_active ? 'Notification hidden from users' : 'Notification shown to users');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Deleted');
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-black text-gray-800">Notifications</h1>
          <p className="text-xs text-gray-400">{notifications.filter(n => n.is_active).length} active</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
          <Plus size={16} /> Send New
        </button>
      </div>

      {/* Send Notification Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-200 mb-4">
          <h3 className="font-bold text-gray-700 text-sm mb-3">New Notification</h3>

          {/* Type Selector */}
          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {TYPE_OPTIONS.map(t => {
              const IconComp = t.icon;
              return (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${form.type === t.id ? t.color + ' border-current' : 'border-gray-200 text-gray-400'}`}>
                  <IconComp size={12} /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <input
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Notification Title (e.g. New Update!)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400 font-semibold"
            />
            <textarea
              value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Notification message for users..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">
                Cancel
              </button>
              <button onClick={handleSend} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
                {saving ? 'Sending...' : 'Send to All Users'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Bell size={36} className="mx-auto mb-2 text-gray-200" />
              <p className="font-semibold">No notifications yet</p>
            </div>
          )}
          {notifications.map(n => {
            const typeCfg = TYPE_OPTIONS.find(t => t.id === n.type) || TYPE_OPTIONS[0];
            const IconComp = typeCfg.icon;
            return (
              <div key={n.id} className={`bg-white rounded-2xl p-4 shadow-sm border transition-opacity ${n.is_active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeCfg.color}`}>
                    <IconComp size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-black text-gray-800 text-sm">{n.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${n.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {n.is_active ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => toggleActive(n)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border ${n.is_active ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-green-50 border-green-200 text-green-600'}`}>
                    {n.is_active ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                  </button>
                  <button onClick={() => handleDelete(n.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border bg-red-50 border-red-200 text-red-500">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
