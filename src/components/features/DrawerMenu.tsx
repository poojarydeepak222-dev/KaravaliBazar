import { X, BarChart2, TrendingUp, Lock, BookOpen, Wallet, HelpCircle, Trophy, MessageSquare, LogOut, ShieldCheck, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const menuItems = [
  { icon: BarChart2, label: 'Charts', path: null, action: 'charts' },
  { icon: TrendingUp, label: 'Game Rates', path: '/game-rates', action: null },
  { icon: Lock, label: 'Change M-PIN', path: '/profile', action: null },
  { icon: BookOpen, label: 'Passbook', path: '/passbook', action: null },
  { icon: Wallet, label: 'Funds', path: '/funds', action: null },
  { icon: HelpCircle, label: 'How To Play', path: null, action: 'how' },
  { icon: Trophy, label: 'Result History', path: '/my-bids', action: null },
  { icon: MessageSquare, label: 'Guessing Forum', path: '/forum', action: null },
];

interface Props { onClose: () => void; }

const DrawerMenu = ({ onClose }: Props) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [apkUrl, setApkUrl] = useState('');
  const [apkVersion, setApkVersion] = useState('');

  useEffect(() => {
    supabase.from('settings').select('key,value').in('key', ['apk_download_url', 'apk_version']).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
        setApkUrl(map.apk_download_url || '');
        setApkVersion(map.apk_version || '');
      }
    });
  }, []);

  const handleItem = (item: typeof menuItems[0]) => {
    if (item.action === 'rates') { toast.info('Single: 9x | Jodi: 90x | Panna: 150x'); onClose(); return; }
    if (item.action === 'how') { toast.info('Select a game → Choose bid type → Enter number & amount → Submit'); onClose(); return; }
    if (item.path) { navigate(item.path); onClose(); }
  };

  const handleLogout = () => { logout(); navigate('/login'); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-80 bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-5 relative" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{user?.name}</p>
              <p className="text-white/70 text-sm">{user?.mobile}</p>
            </div>
          </div>
        </div>
        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => (
            <button key={item.label} onClick={() => handleItem(item)} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-orange-50 transition-colors text-left">
              <item.icon size={20} className="text-orange-500" />
              <span className="text-gray-700 font-medium">{item.label}</span>
              <span className="ml-auto text-gray-300">›</span>
            </button>
          ))}
          {user?.role === 'admin' && (
            <button onClick={() => { navigate('/admin'); onClose(); }} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-orange-50 transition-colors text-left">
              <ShieldCheck size={20} className="text-blue-500" />
              <span className="text-blue-600 font-bold">Admin Panel</span>
              <span className="ml-auto bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">Admin</span>
            </button>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 space-y-1">
          {/* Share App Button */}
          <button
            onClick={() => {
              const appUrl = window.location.origin;
              const text = `🎯 Play Matka online on *Karavali Bazar*!\n💰 Fast Withdrawals | Trusted Platform | 18+ Only\n\n👉 Open App: ${appUrl}${apkUrl ? `\n📲 Download Android App: ${apkUrl}` : ''}\n\nJoin now and start winning! 🏆`;
              const encoded = encodeURIComponent(text);
              window.open(`https://wa.me/?text=${encoded}`, '_blank');
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}
          >
            <Share2 size={18} />
            <span>Share via WhatsApp</span>
          </button>
          {apkUrl && (
            <a
              href={apkUrl}
              download
              onClick={onClose}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
            >
              <Share2 size={18} />
              <span>Download App{apkVersion ? ` ${apkVersion}` : ''}</span>
            </a>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin);
              toast.success('App link copied! Share it with friends.');
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-blue-600 text-sm bg-blue-50 border border-blue-100"
          >
            <Share2 size={18} />
            <span>Copy App Link</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-red-500 font-semibold py-2 px-1">
            <LogOut size={20} />
            <span>Logout Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawerMenu;
