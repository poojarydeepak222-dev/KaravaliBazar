import { useState, useEffect, useRef } from 'react';
import { Save, Edit2, IndianRupee, MessageSquare, Settings, QrCode, TrendingUp, Loader2, Smartphone, Upload, CheckCircle2, Download, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Setting } from '@/types';
import { toast } from 'sonner';

const RATE_KEYS = [
  { key: 'single_rate',       label: 'Single Digit',  color: '#FF6B1A', bg: '#FFF0E8', placeholder: '7',   unit: 'x' },
  { key: 'jodi_rate',         label: 'Jodi',          color: '#8B5CF6', bg: '#F3EEFF', placeholder: '70',  unit: 'x' },
  { key: 'panna_rate',        label: 'Single Panna',  color: '#22C55E', bg: '#F0FDF4', placeholder: '120', unit: 'x' },
  { key: 'double_panna_rate', label: 'Double Panna',  color: '#06B6D4', bg: '#ECFEFF', placeholder: '270', unit: 'x' },
  { key: 'triple_panna_rate', label: 'Triple Panna',  color: '#F43F5E', bg: '#FFF1F2', placeholder: '600', unit: 'x' },
];

const settingGroups = [
  {
    title: 'UPI Payment Settings', icon: IndianRupee, color: 'text-green-600 bg-green-50',
    keys: [
      { key: 'upi_id', label: 'UPI ID', placeholder: 'yourupi@ybl' },
      { key: 'upi_name', label: 'UPI Display Name', placeholder: 'Karavali Bazar' },
      { key: 'qr_code_url', label: 'QR Code Image URL', placeholder: 'https://... (paste your UPI QR image link)' },
    ]
  },
  {
    title: 'Deposit & Withdrawal Limits', icon: Settings, color: 'text-blue-600 bg-blue-50',
    keys: [
      { key: 'min_deposit', label: 'Min Deposit (₹)', placeholder: '100' },
      { key: 'max_deposit', label: 'Max Deposit (₹)', placeholder: '50000' },
      { key: 'min_withdraw', label: 'Min Withdrawal (₹)', placeholder: '500' },
      { key: 'max_withdraw', label: 'Max Withdrawal (₹)', placeholder: '100000' },
    ]
  },
  {
    title: 'Contact & Notifications', icon: MessageSquare, color: 'text-purple-600 bg-purple-50',
    keys: [
      { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '9999999999' },
      { key: 'announcement', label: 'App Announcement', placeholder: 'Welcome message...' },
    ]
  }
];

const AdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [rateValues, setRateValues] = useState<Record<string, string>>({});
  const [ratesEditing, setRatesEditing] = useState(false);
  const [ratesSaving, setRatesSaving] = useState(false);
  const [apkUploading, setApkUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [apkVersion, setApkVersion] = useState('');
  const [apkVersionSaving, setApkVersionSaving] = useState(false);
  const [apkDeleting, setApkDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const apkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('settings').select('*').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        (data as Setting[]).forEach(s => { map[s.key] = s.value; });
        setSettings(map);
        // Pre-fill rate values
        const rv: Record<string, string> = {};
        RATE_KEYS.forEach(r => { rv[r.key] = map[r.key] || r.placeholder; });
        setRateValues(rv);
        setApkVersion(map.apk_version || '');
      }
      setLoading(false);
    });
  }, []);

  const handleSaveRates = async () => {
    setRatesSaving(true);
    const upserts = RATE_KEYS.map(r => ({ key: r.key, value: rateValues[r.key] || r.placeholder, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' });
    setRatesSaving(false);
    if (error) return toast.error('Failed to save rates');
    setSettings(prev => { const updated = { ...prev }; RATE_KEYS.forEach(r => { updated[r.key] = rateValues[r.key]; }); return updated; });
    setRatesEditing(false);
    toast.success('Game rates saved! All settlements will use new rates.');
  };

  const handleApkVersionSave = async () => {
    setApkVersionSaving(true);
    const { error } = await supabase.from('settings').upsert(
      { key: 'apk_version', value: apkVersion.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    setApkVersionSaving(false);
    if (error) return toast.error('Failed to save version');
    setSettings(prev => ({ ...prev, apk_version: apkVersion.trim() }));
    toast.success('Version saved! Badge updated on both dashboards.');
  };

  const handleApkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.apk')) return toast.error('Please upload a valid .apk file');
    if (file.size > 100 * 1024 * 1024) return toast.error('File too large. Max size is 100 MB.');

    setApkUploading(true);
    setUploadProgress(0);

    const fileName = `karavali-bazar-${Date.now()}.apk`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    // Use POST for new upload with x-upsert:true to overwrite existing
    const uploadUrl = `${supabaseUrl}/storage/v1/object/apk-files/${fileName}`;

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setUploadProgress(pct);
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data: urlData } = supabase.storage.from('apk-files').getPublicUrl(fileName);
        const apkUrl = urlData.publicUrl;
        await supabase.from('settings').upsert(
          { key: 'apk_download_url', value: apkUrl, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
        setSettings(prev => ({ ...prev, apk_download_url: apkUrl }));
        setApkUploading(false);
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(0), 800);
        toast.success('APK uploaded successfully! Download button is now live on both dashboards.');
        if (apkInputRef.current) apkInputRef.current.value = '';
      } else {
        let errMsg = 'Upload failed';
        try {
          const parsed = JSON.parse(xhr.responseText);
          errMsg = parsed?.message || parsed?.error || errMsg;
        } catch { /* ignore */ }
        setApkUploading(false);
        setUploadProgress(0);
        toast.error(`Upload failed: ${errMsg}`);
      }
    });

    xhr.addEventListener('error', () => {
      setApkUploading(false);
      setUploadProgress(0);
      toast.error('Network error. Check your connection and try again.');
    });

    xhr.addEventListener('abort', () => {
      setApkUploading(false);
      setUploadProgress(0);
      toast.info('Upload cancelled.');
    });

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
    xhr.setRequestHeader('Content-Type', 'application/vnd.android.package-archive');
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('cache-control', 'max-age=3600');
    xhr.send(file);
  };

  const handleApkDelete = async () => {
    setApkDeleting(true);
    const url = settings.apk_download_url || '';
    // Extract file name from URL to delete from storage
    try {
      const parts = url.split('/apk-files/');
      const fileName = parts[1];
      if (fileName) {
        await supabase.storage.from('apk-files').remove([fileName]);
      }
    } catch { /* ignore storage delete errors */ }
    // Clear the settings entries
    await supabase.from('settings').upsert(
      [{ key: 'apk_download_url', value: '', updated_at: new Date().toISOString() },
       { key: 'apk_version', value: '', updated_at: new Date().toISOString() }],
      { onConflict: 'key' }
    );
    setSettings(prev => ({ ...prev, apk_download_url: '', apk_version: '' }));
    setApkVersion('');
    setApkDeleting(false);
    setShowDeleteConfirm(false);
    toast.success('APK deleted. Download button removed from all dashboards.');
    if (apkInputRef.current) apkInputRef.current.value = '';
  };

  const handleSave = async (key: string) => {
    const { error } = await supabase.from('settings').upsert(
      { key, value: settings[key] || '', updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) return toast.error('Failed to save');
    setEditing(prev => ({ ...prev, [key]: false }));
    toast.success('Setting saved!');
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-black text-gray-800">App Settings</h1>

      {/* ── GAME RATES SECTION ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-orange-600 bg-orange-50">
              <TrendingUp size={16} />
            </div>
            <span className="font-bold text-gray-700 text-sm">Game Rates (Multiplier)</span>
          </div>
          {ratesEditing ? (
            <button onClick={handleSaveRates} disabled={ratesSaving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold bg-green-500 disabled:opacity-60">
              {ratesSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save All
            </button>
          ) : (
            <button onClick={() => setRatesEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-orange-500 bg-orange-50 border border-orange-200 text-xs font-bold">
              <Edit2 size={12} /> Edit Rates
            </button>
          )}
        </div>
        <div className="space-y-2">
          {RATE_KEYS.map(r => (
            <div key={r.key} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: r.bg }}>
              <div className="flex-1">
                <p className="text-xs font-black" style={{ color: r.color }}>{r.label}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">1 ×</span>
                {ratesEditing ? (
                  <input
                    type="number"
                    value={rateValues[r.key] || ''}
                    onChange={e => setRateValues(prev => ({ ...prev, [r.key]: e.target.value }))}
                    className="w-20 border-2 rounded-lg px-2 py-1 text-center text-sm font-black outline-none"
                    style={{ borderColor: r.color, color: r.color }}
                  />
                ) : (
                  <span className="text-2xl font-black" style={{ color: r.color }}>{settings[r.key] || r.placeholder}</span>
                )}
                <span className="text-xs font-bold" style={{ color: r.color }}>x</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center">Changes apply to all future settlements automatically</p>
      </div>

      {settingGroups.map(group => (
        <div key={group.title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${group.color}`}>
              <group.icon size={16} />
            </div>
            <span className="font-bold text-gray-700 text-sm">{group.title}</span>
          </div>
          <div className="space-y-3">
            {group.keys.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                <div className="flex gap-2 items-start">
                  <input
                    value={settings[key] || ''}
                    onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                    disabled={!editing[key]}
                    placeholder={placeholder}
                    className={`flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${editing[key] ? 'border-orange-400 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                  />
                  {editing[key] ? (
                    <button onClick={() => handleSave(key)}
                      className="px-3 py-2.5 rounded-xl text-white text-xs font-bold bg-green-500 shrink-0">
                      <Save size={14} />
                    </button>
                  ) : (
                    <button onClick={() => setEditing(prev => ({ ...prev, [key]: true }))}
                      className="px-3 py-2.5 rounded-xl text-orange-500 bg-orange-50 border border-orange-200 text-xs font-bold shrink-0">
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
                {/* QR preview */}
                {key === 'qr_code_url' && settings[key] && (
                  <div className="mt-2">
                    <img src={settings[key]} alt="QR Preview" className="w-24 h-24 rounded-xl border border-gray-200 object-cover" />
                    <p className="text-[10px] text-green-600 font-semibold mt-1">QR Code live — users will see this on deposit screen</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── APK DOWNLOAD SECTION ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-600 bg-indigo-50">
            <Smartphone size={16} />
          </div>
          <span className="font-bold text-gray-700 text-sm">Android App APK</span>
        </div>
        {/* Version Field */}
        <div className="mb-3">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">App Version (e.g. v1.2)</label>
          <div className="flex gap-2">
            <input
              value={apkVersion}
              onChange={e => setApkVersion(e.target.value)}
              placeholder="v1.0"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-gray-50"
            />
            <button
              onClick={handleApkVersionSave}
              disabled={apkVersionSaving || !apkVersion.trim()}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold bg-indigo-500 disabled:opacity-50 flex items-center gap-1.5"
            >
              {apkVersionSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
          </div>
          {settings.apk_version && (
            <p className="text-[10px] text-indigo-600 font-semibold mt-1">Current: <span className="font-mono bg-indigo-50 px-1 rounded">{settings.apk_version}</span> — shown as badge on download buttons</p>
          )}
        </div>

        {settings.apk_download_url ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-green-700 mb-1">APK Uploaded — Download button live on both dashboards</p>
                <p className="text-[10px] text-green-600 break-all font-mono">{settings.apk_download_url}</p>
              </div>
            </div>
            {/* Delete APK */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-bold bg-red-50 active:scale-[0.98] transition-transform"
              >
                <Trash2 size={13} />
                Delete Uploaded APK
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <p className="text-xs font-bold text-red-700">Confirm Delete?</p>
                </div>
                <p className="text-[10px] text-red-600 mb-3">This will remove the APK and hide the Download button from all pages immediately.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleApkDelete}
                    disabled={apkDeleting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-bold bg-red-500 disabled:opacity-60"
                  >
                    {apkDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    {apkDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-xl text-gray-600 text-xs font-bold bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
            <p className="text-xs text-amber-700 font-semibold">No APK uploaded yet. Upload your APK file to show a download button on user & public dashboards.</p>
          </div>
        )}
        <input
          ref={apkInputRef}
          type="file"
          accept=".apk"
          onChange={handleApkUpload}
          className="hidden"
        />

        {/* Upload Progress Bar */}
        {apkUploading && (
          <div className="mb-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-indigo-600 animate-spin" />
                <span className="text-xs font-bold text-indigo-700">Uploading APK...</span>
              </div>
              <span className="text-sm font-black text-indigo-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-200"
                style={{
                  width: `${uploadProgress}%`,
                  background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                }}
              />
            </div>
            <p className="text-[10px] text-indigo-500 mt-1.5 text-center font-medium">
              {uploadProgress < 100 ? 'Please wait, do not close this page...' : 'Finalizing upload...'}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => apkInputRef.current?.click()}
            disabled={apkUploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60 active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          >
            {apkUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {apkUploading ? `Uploading ${uploadProgress}%` : settings.apk_download_url ? 'Replace APK' : 'Upload APK File'}
          </button>
          {settings.apk_download_url && !apkUploading && (
            <a
              href={settings.apk_download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-bold"
            >
              <Download size={14} /> Test
            </a>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">Max file size: 100MB · Android only (.apk)</p>
      </div>

      {/* ── HOW TO BUILD ANDROID APK ── */}
      <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone size={16} className="text-indigo-600" />
          <p className="text-xs font-bold text-indigo-700">How to Build Your Android APK</p>
        </div>
        <p className="text-xs text-indigo-700 font-semibold mb-2">Method 1 — WebIntoApp (Easiest, Free)</p>
        <ol className="text-xs text-indigo-600 space-y-1 list-decimal list-inside mb-3">
          <li>Go to <span className="font-mono font-bold">webintoapp.com</span></li>
          <li>Enter your published app URL (from the Publish button above)</li>
          <li>Set app name: <span className="font-bold">Karavali Bazar</span></li>
          <li>Upload your icon and set theme color <span className="font-mono">#FF6B1A</span></li>
          <li>Click Build → Download the .apk file</li>
          <li>Upload the .apk here using the Upload button above</li>
        </ol>
        <a
          href="https://webintoapp.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-bold mb-3"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          <ExternalLink size={13} />
          Open WebIntoApp.com
        </a>
        <p className="text-xs text-indigo-700 font-semibold mb-2">Method 2 — GoNative.io (More Features)</p>
        <ol className="text-xs text-indigo-600 space-y-1 list-decimal list-inside mb-3">
          <li>Go to <span className="font-mono font-bold">gonative.io</span></li>
          <li>Enter your app URL and configure settings</li>
          <li>Download the Android APK from the dashboard</li>
        </ol>
        <p className="text-[10px] text-indigo-500 font-medium">💡 Tip: First publish your website using the Publish button at the top right, then use that URL to build the APK.</p>
      </div>

      {/* How to add QR code */}
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <QrCode size={16} className="text-blue-600" />
          <p className="text-xs font-bold text-blue-700">How to add UPI QR Code</p>
        </div>
        <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
          <li>Open your UPI app (GPay/PhonePe/Paytm)</li>
          <li>Go to your merchant/receive money QR</li>
          <li>Screenshot the QR code</li>
          <li>Upload to any image host (e.g. imgbb.com)</li>
          <li>Paste the image URL in "QR Code Image URL" above</li>
        </ol>
      </div>

      {/* Admin Info */}
      <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
        <p className="text-xs font-bold text-orange-700 mb-2">Admin Login Credentials</p>
        <div className="space-y-1 text-xs text-orange-600">
          <p>Mobile: <span className="font-mono font-bold">9999999999</span></p>
          <p>Password: <span className="font-mono font-bold">Karavali@2024</span></p>
          <p>MPIN: <span className="font-mono font-bold">1234</span></p>
        </div>
        <p className="text-xs text-orange-500 mt-2">Change credentials from Profile page after login.</p>
      </div>
    </div>
  );
};

export default AdminSettings;
