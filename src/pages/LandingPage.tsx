
import { useState, useEffect, useRef } from 'react';
import { Bell, BarChart2, RefreshCw, Play, Calendar, Clock, ChevronRight, Trophy, Download, Share2, Copy, X, MessageCircle, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Game, Setting } from '@/types';
import { toast } from 'sonner';

const LandingPage = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
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
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
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
      toast.success('App link copied!');
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

  const statusColors: Record<string, string> = {
    upcoming: 'text-yellow-600 bg-yellow-50 border border-yellow-200',
    open: 'text-green-600 bg-green-50 border border-green-200',
    closed: 'text-red-500 bg-red-50 border border-red-200',
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
              <span className="text-white font-black text-sm tracking-tight">KB</span>
            </div>
            <div>
              <p className="text-white font-black text-lg tracking-wider leading-none">KARAVALI BAZAR</p>
              <p className="text-white/70 text-[10px] font-medium">Bid Carefully • 18+ Only</p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
          >
            <Share2 size={14} className="text-white" />
            <span className="text-white text-xs font-bold">Share</span>
          </button>
        </div>
      </div>

      {/* Announcement Banner */}
      {announcement && !annDismissed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Bell size={15} className="text-amber-600 shrink-0" />
          <p className="text-amber-700 text-sm flex-1 font-medium">{announcement}</p>
          <button onClick={() => setAnnDismissed(true)} className="text-amber-400 text-lg leading-none ml-1">✕</button>
        </div>
      )}

      {/* Marquee */}
      <div className="bg-orange-50 border-b border-orange-100 overflow-hidden py-1.5">
        <div className="animate-marquee whitespace-nowrap inline-block">
          <span className="text-orange-600 text-sm font-semibold px-4">🎉 WELCOME TO KARAVALI BAZAR OFFICIAL APP 🎉</span>
          <span className="text-orange-600 text-sm font-semibold px-4">✅ Fast Withdrawal | Trusted Platform | 18+ Only</span>
          <span className="text-orange-600 text-sm font-semibold px-4">📲 Register Now and Start Playing!</span>
          <span className="text-orange-600 text-sm font-semibold px-4">🎉 WELCOME TO KARAVALI BAZAR OFFICIAL APP 🎉</span>
          <span className="text-orange-600 text-sm font-semibold px-4">✅ Fast Withdrawal | Trusted Platform | 18+ Only</span>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {/* Date & Time Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-orange-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-700">{formatDate(now)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-orange-50 rounded-xl px-2.5 py-1">
            <Clock size={13} className="text-orange-500" />
            <span className="text-sm font-bold text-orange-600 font-mono">{formatTime(now)}</span>
          </div>
        </div>

        {/* Notice Board */}
        <div className="rounded-2xl p-4 shadow-sm overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-3 -left-3 w-14 h-14 rounded-full bg-white/10" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Bell size={15} className="text-white" />
            </div>
            <span className="text-white font-black text-sm tracking-widest">NOTICE BOARD</span>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2.5 relative z-10">
            <p className="text-white text-sm font-medium leading-relaxed">
              {announcement || 'Welcome to Karavali Bazar! Play responsibly. 18+ only.'}
            </p>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-orange-500" />
            <span className="font-black text-gray-800 text-base">LIVE MARKET RESULTS</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <RefreshCw size={11} />
            <span>Auto-updates 15s</span>
          </div>
        </div>

        {/* Game Result Cards */}
        <div className="space-y-3">
          {games.map(game => (
            <div key={game.id} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
              {/* Game Header */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-800 text-base tracking-wide">{game.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">
                      OPEN: <span className="font-semibold text-gray-600">{game.open_time}</span>
                    </span>
                    <span className="text-gray-200">|</span>
                    <span className="text-xs text-gray-400">
                      CLOSE: <span className="font-semibold text-gray-600">{game.close_time}</span>
                    </span>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusColors[game.status] || statusColors.upcoming}`}>
                  {game.status.toUpperCase()}
                </span>
              </div>

              {/* Big Result Display */}
              <div className="mx-4 mb-3 rounded-xl py-4 px-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fff5f0 0%, #fff0f8 100%)', border: '1px solid #ffe0d0' }}>
                {(game.open_pana || game.jodi || game.close_pana) ? (
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-orange-500 font-bold mb-1 tracking-widest">OPEN</p>
                      <span className="font-black text-2xl text-orange-500 leading-none">{game.open_pana || '***'}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-px h-6 bg-orange-200" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-bold mb-1 tracking-widest">JODI</p>
                      {game.jodi ? (
                        <span className="font-black text-4xl text-gray-900 leading-none">{game.jodi}</span>
                      ) : game.open_pana ? (
                        <span className="font-black text-4xl text-gray-900 leading-none">
                          {String(game.open_pana.split('').reduce((a: number, d: string) => a + parseInt(d || '0', 10), 0) % 10)}*
                        </span>
                      ) : (
                        <span className="font-black text-4xl text-gray-400 leading-none font-mono">**</span>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-px h-6 bg-orange-200" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-blue-500 font-bold mb-1 tracking-widest">CLOSE</p>
                      <span className="font-black text-2xl text-blue-500 leading-none">{game.close_pana || '***'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 font-bold mb-1 tracking-widest">RESULT</p>
                    <span className="font-black text-3xl text-gray-700 tracking-[0.2em] font-mono">
                      {game.current_result || '*** ** ***'}
                    </span>
                  </div>
                )}
              </div>

              {/* Chart Button */}
              <button
                onClick={() => navigate(`/game/${game.id}/chart`)}
                className="w-full flex items-center justify-center gap-2 py-3 border-t border-gray-100 text-blue-600 text-sm font-bold active:bg-blue-50 transition-colors"
              >
                <BarChart2 size={16} />
                View Weekly Chart
                <ChevronRight size={14} />
              </button>
            </div>
          ))}

          {games.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🎯</div>
              <p className="font-bold text-gray-700">No games available</p>
              <p className="text-gray-400 text-sm mt-1">Check back soon</p>
            </div>
          )}
        </div>
      </div>

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
              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-50 border border-green-100 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                  <MessageCircle size={22} className="text-white" />
                </div>
                <span className="text-xs font-bold text-green-700">WhatsApp</span>
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-50 border border-blue-100 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                  <Link size={22} className="text-white" />
                </div>
                <span className="text-xs font-bold text-blue-700">{linkCopied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              {/* More / Native Share */}
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
              Share the link — friends can open it instantly in their browser
            </p>
          </div>
        </div>
      )}

      {/* Sticky Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-2xl px-4 pt-3 pb-5">
        <div className="flex gap-2.5 mb-2">
          {/* Download App Button — only shows if APK is uploaded */}
          {apkUrl ? (
            <a
              href={apkUrl}
              download
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg active:scale-95 transition-transform min-w-[140px]"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              <Download size={17} />
              <span>Download App{apkVersion ? <span className="ml-1 text-xs font-mono opacity-80">{apkVersion}</span> : null}</span>
            </a>
          ) : (
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-transform min-w-[130px] border border-gray-200 text-gray-600 bg-white"
            >
              <Share2 size={17} />
              Share App
            </button>
          )}
          {/* Play Online Button */}
          <button
            onClick={() => navigate('/login')}
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-white font-black text-lg tracking-widest shadow-2xl active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}
          >
            <Play size={20} fill="white" className="shrink-0" />
            PLAY ONLINE
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 font-medium">Login or Register to place bids • Bid Carefully • 18+</p>
      </div>
    </div>
  );
};

export default LandingPage;
