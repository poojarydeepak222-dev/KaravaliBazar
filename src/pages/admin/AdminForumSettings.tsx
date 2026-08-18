import { useEffect, useState } from 'react';
import { MessageSquare, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const AdminForumSettings = () => {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'forum_enabled').maybeSingle().then(({ data }) => {
      if (data?.value !== undefined) setEnabled(data.value !== 'false');
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('settings').upsert(
      { key: 'forum_enabled', value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    setSaving(false);
    if (error) return toast.error('Failed to save Forum visibility');
    toast.success(`Forum ${enabled ? 'shown' : 'hidden'} on the public landing page`);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="p-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="font-black text-gray-800">Forum Visibility</h1>
            <p className="text-xs text-gray-400">Control the Forum button on the public landing page</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEnabled(v => !v)}
          className="w-full flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 mb-4"
        >
          <div className="text-left">
            <p className="font-bold text-gray-800">Show Forum</p>
            <p className="text-xs text-gray-400 mt-0.5">{enabled ? 'Forum button is visible' : 'Forum button is hidden'}</p>
          </div>
          <div className={`w-12 h-7 rounded-full p-1 transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>

        <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Forum Setting'}
        </button>
      </div>
    </div>
  );
};

export default AdminForumSettings;
