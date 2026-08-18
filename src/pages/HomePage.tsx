import { useState, useEffect, useRef } from 'react';
import { Menu, ArrowDown, ArrowUp, MessageSquare, TrendingUp, RefreshCw, Calendar, Clock, Bell, Download, Share2, Copy, X, Link } from 'lucide-react';
import NotificationBell from '@/components/features/NotificationBell';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Game, Setting } from '@/types';
import BottomNav from '@/components/layout/BottomNav';
import DrawerMenu from '@/components/features/DrawerMenu';
import GameCard from '@/components/features/GameCard';
import { useGameAutoStatus } from '@/hooks/useGameAutoStatus';
import { toast } from 'sonner';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [annDismissed, setAnnDismissed] = useState(false);
  const [now, setNow] = useState(new Date());
  const [apkUrl, setApkUrl] = useState('');
  const [apkVersion, setApkVersion] = useState('');
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    const { data: gamesData } = await supabase.from('games').select('*').eq('is_active', true).order('sort_order');
    if (gamesData) setGames(gamesData);
    const { data: settingsData } = await supabase.from('settings').select('*');
    if (settingsData) {
      const map: Record<string, string> = {};
      settingsData.forEach((s: Setting) => { map[s.key] = s.value; });
      setSettings(map);
      setAnnouncement(map.announcement || '');
      setApkUrl(map.apk_download_url || '');
      setApkVersion(map.apk_version || '');
    }
    if (user) {
      const { data: u } = await supabase.from('app_users').select('balance').eq('id', user.id).single();
      if (u) updateBalance(u.balance);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 10000);
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, []);

  const appUrl = window.location.origin;
  const shareText = `🎯 Play Matka online on *Karavali Bazar*!\n💰 Fast Withdrawals | Trusted Platform | 18+ Only\n\n👉 Open App: ${appUrl}${apkUrl ? `\n📲 Download Android App: ${apkUrl}` : ''}\n\nJoin now and start winning! 🏆`;

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    setShowShareSheet(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast.success('App link copied! Share it with friends.');
    });
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Karavali Bazar – Play Matka Online',
        text: shareText,
        url: appUrl,
      });
      setShowShareSheet(false);
    }
  };

  const handleShare = () => setShowShareSheet(true);

  const quickActions = [
    { icon: ArrowDown, label: 'Deposit', color: 'text-orange-500 bg-orange-50', action: () => navigate('/funds') },
    { icon: ArrowUp, label: 'Withdraw', color: 'text-teal-500 bg-teal-50', action: () => navigate('/funds?tab=withdraw') },
    { icon: MessageSquare, label: 'WhatsApp', color: 'text-green-500 bg-green-50', action: () => window.open(`https://wa.me/${settings.whatsapp_number || '9999999999'}`) },
    { icon: TrendingUp, label: 'Game\nRates', color: 'text-purple-500 bg-purple-50', action: () => navigate('/game-rates') },
  ];

  // Auto-manage game status based on open/close times
  useGameAutoStatus();

  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {drawerOpen && <DrawerMenu onClose={() => setDrawerOpen(false)} />}

      {/* Share Bottom Sheet */}
      {showShareSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowShareSheet(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-black text-gray-800 text-lg">Share Karavali Bazar</p>
                <p className="text-xs text-gray-400 mt-0.5">Invite friends & earn together</p>
              </div>
              <button onClick={() => setShowShareSheet(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* APK Download Link */}
            {apkUrl && (
              <a
                href={apkUrl}
                download
                onClick={() => setShowShareSheet(false)}
                className="w-full flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 mb-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                  <Download size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-indigo-800 text-sm">Download APK Directly</p>
                  <p className="text-[10px] text-indigo-500 truncate font-mono">{apkUrl}</p>
                </div>
                {apkVersion && (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-lg shrink-0">{apkVersion}</span>
                )}
              </a>
            )}

            {/* App link preview */}
            <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
                <span className="text-white font-black text-sm">KB</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">Karavali Bazar</p>
                <p className="text-xs text-gray-400 truncate">{appUrl}</p>
              </div>
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  linkCopied ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-orange-600 border border-orange-100'
                }`}
              >
                <Copy size={12} />
                {linkCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Share Options */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-50 border border-green-100 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                  <MessageSquare size={22} className="text-white" />
                </div>
                <span className="text-xs font-bold text-green-700">WhatsApp</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-50 border border-blue-100 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                  <Link size={22} className="text-white" />
                </div>
                <span className="text-xs font-bold text-blue-700">{linkCopied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-50 border border-purple-100 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center shadow-md">
                    <Share2 size={22} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-purple-700">More</span>
                </button>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Share the link — friends open it instantly in their browser
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setDrawerOpen(true)} className="text-white p-1">
            <Menu size={24} />
          </button>
          <span className="text-white font-black text-xl tracking-wider">KARAVALI BAZAR</span>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-full px-3 py-1.5 flex items-center gap-1 cursor-pointer active:scale-95 transition-transform" onClick={() => navigate('/funds')}>
              <span className="text-white text-xs font-bold">₹ {(user?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Announcement */}
      {announcement && !annDismissed && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
          <Bell size={16} className="text-yellow-600 shrink-0" />
          <p className="text-yellow-700 text-sm flex-1">{announcement}</p>
          <button onClick={() => setAnnDismissed(true)} className="text-yellow-400">✕</button>
        </div>
      )}

      {/* Marquee */}
      <div className="bg-orange-50 border-b border-orange-100 overflow-hidden py-1.5">
        <div className="animate-marquee whitespace-nowrap inline-block">
          <span className="text-orange-600 text-sm font-semibold px-4">🎉 WELCOME TO KARAVALI BAZAR OFFICIAL APP 🎉</span>
          <span className="text-orange-600 text-sm font-semibold px-4">✅ Fast Withdraw | Trusted Platform | 18+ Only</span>
        </div>
      </div>

      <div className="px-4 pt-3">
        {/* Date & Time */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">{formatDate(now)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-orange-500" />
            <span className="text-sm font-bold text-gray-800 font-mono">{formatTime(now)}</span>
          </div>
        </div>

        {/* App Download / Share Banner */}
        {apkUrl ? (
          <a
            href={apkUrl}
            download
            className="w-full flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-indigo-100 px-4 py-3 mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
              <Download size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-gray-800">Download Karavali Bazar App</p>
              <p className="text-xs text-gray-400">Tap to download & install on Android</p>
            </div>
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
              {apkVersion || 'FREE'}
            </span>
          </a>
        ) : (
          <button
            onClick={handleShare}
            className="w-full flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-blue-100 px-4 py-3 mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
              <Share2 size={18} className="text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-gray-800">Share Karavali Bazar</p>
              <p className="text-xs text-gray-400">Invite friends to play & win</p>
            </div>
            <span className="text-xs font-bold text-blue-600 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100">
              Share
            </span>
          </button>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="flex justify-around">
            {quickActions.map(({ icon: Icon, label, color, action }) => (
              <button key={label} onClick={action} className="flex flex-col items-center gap-1">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs text-gray-500 text-center leading-tight whitespace-pre">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Markets */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-black text-gray-800 text-base">LIVE MARKETS</span>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <RefreshCw size={12} />
            <span>Auto-updates every 10s</span>
          </div>
        </div>

        <div className="space-y-3">
          {games.map(game => <GameCard key={game.id} game={game} />)}
          {games.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>No games available</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomePage;
