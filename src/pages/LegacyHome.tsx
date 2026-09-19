import { useEffect, useRef, useState } from "react";
import { Bell, BarChart2, Calendar, ChevronRight, Clock, Copy, Link, RefreshCw, Share2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Game, Setting } from "@/types";

const LegacyHome = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [now, setNow] = useState(new Date());
  const [dismissed, setDismissed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const { data: gameData } = await supabase.from("games").select("*").eq("is_active", true).order("sort_order");
    if (gameData) setGames(gameData);
    const { data: settingData } = await supabase.from("settings").select("*");
    if (settingData) {
      const map: Record<string, string> = {};
      settingData.forEach((s: Setting) => { map[s.key] = s.value; });
      setAnnouncement(map.announcement || "");
    }
  };

  useEffect(() => {
    load();
    const refresh = setInterval(load, 15000);
    timer.current = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(refresh);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const appUrl = window.location.origin + window.location.pathname.replace(/\/$/, "");
  const copy = async () => {
    await navigator.clipboard?.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const nativeShare = async () => {
    if (navigator.share) await navigator.share({ title: "Karavali Bazar", text: "Karavali Bazar public information and results", url: appUrl });
  };

  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  const statusClass: Record<string, string> = {
    upcoming: "text-yellow-600 bg-yellow-50 border-yellow-200",
    open: "text-green-600 bg-green-50 border-green-200",
    closed: "text-red-500 bg-red-50 border-red-200"
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="sticky top-0 z-30" style={{ background: "linear-gradient(135deg,#FF6B1A 0%,#FF1D78 100%)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-sm">KB</span>
            </div>
            <div>
              <p className="text-white font-black text-lg tracking-wider leading-none">KARAVALI BAZAR</p>
              <p className="text-white/75 text-[10px] font-medium">Public Information & Results</p>
            </div>
          </div>
          <button onClick={() => setShareOpen(true)} className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
            <Share2 size={14} className="text-white" /><span className="text-white text-xs font-bold">Share</span>
          </button>
        </div>
      </header>

      {announcement && !dismissed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Bell size={15} className="text-amber-600 shrink-0" />
          <p className="text-amber-700 text-sm flex-1 font-medium">{announcement}</p>
          <button onClick={() => setDismissed(true)} className="text-amber-400 text-lg">×</button>
        </div>
      )}

      <div className="bg-orange-50 border-b border-orange-100 overflow-hidden py-1.5">
        <div className="animate-marquee whitespace-nowrap inline-block">
          <span className="text-orange-600 text-sm font-semibold px-4">🎉 WELCOME TO KARAVALI BAZAR 🎉</span>
          <span className="text-orange-600 text-sm font-semibold px-4">✅ Public results and information</span>
          <span className="text-orange-600 text-sm font-semibold px-4">📊 Check the latest charts</span>
        </div>
      </div>

      <main className="px-4 pt-3 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><Calendar size={15} className="text-orange-500" /><span className="text-sm font-semibold text-gray-700">{date}</span></div>
          <div className="flex items-center gap-1.5 bg-orange-50 rounded-xl px-2.5 py-1"><Clock size={13} className="text-orange-500" /><span className="text-sm font-bold text-orange-600 font-mono">{time}</span></div>
        </div>

        <div className="rounded-2xl p-4 shadow-sm overflow-hidden relative" style={{ background: "linear-gradient(135deg,#FF6B1A 0%,#FF1D78 100%)" }}>
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><Bell size={15} className="text-white" /></div>
            <span className="text-white font-black text-sm tracking-widest">NOTICE BOARD</span>
          </div>
          <div className="bg-white/20 rounded-xl px-3 py-2.5 relative z-10">
            <p className="text-white text-sm font-medium leading-relaxed">{announcement || "Welcome to Karavali Bazar. Public information and results are available here."}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2"><BarChart2 size={18} className="text-orange-500" /><span className="font-black text-gray-800 text-base">LIVE MARKET RESULTS</span></div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs"><RefreshCw size={11} /><span>Auto-updates 15s</span></div>
        </div>

        <div className="space-y-3">
          {games.map(game => (
            <div key={game.id} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-800 text-base tracking-wide">{game.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <span>OPEN: <b className="text-gray-600">{game.open_time}</b></span><span>|</span><span>CLOSE: <b className="text-gray-600">{game.close_time}</b></span>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusClass[game.status] || statusClass.upcoming}`}>{String(game.status || "upcoming").toUpperCase()}</span>
              </div>
              <div className="mx-4 mb-3 rounded-xl py-4 px-3 flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-100">
                {(game.open_pana || game.jodi || game.close_pana) ? (
                  <div className="flex items-center gap-4">
                    <div className="text-center"><p className="text-[10px] text-orange-500 font-bold mb-1 tracking-widest">OPEN</p><span className="font-black text-2xl text-orange-500">{game.open_pana || "***"}</span></div>
                    <div className="w-px h-7 bg-orange-200" />
                    <div className="text-center"><p className="text-[10px] text-gray-500 font-bold mb-1 tracking-widest">JODI</p><span className="font-black text-4xl text-gray-900">{game.jodi || "**"}</span></div>
                    <div className="w-px h-7 bg-orange-200" />
                    <div className="text-center"><p className="text-[10px] text-blue-500 font-bold mb-1 tracking-widest">CLOSE</p><span className="font-black text-2xl text-blue-500">{game.close_pana || "***"}</span></div>
                  </div>
                ) : (
                  <div className="text-center"><p className="text-[10px] text-gray-400 font-bold mb-1 tracking-widest">RESULT</p><span className="font-black text-3xl text-gray-700 tracking-[0.2em] font-mono">{game.current_result || "*** ** ***"}</span></div>
                )}
              </div>
              <button onClick={() => navigate(`/game/${game.id}/chart`)} className="w-full flex items-center justify-center gap-2 py-3 border-t border-gray-100 text-blue-600 text-sm font-bold active:bg-blue-50">
                <BarChart2 size={16} /> View Weekly Chart <ChevronRight size={14} />
              </button>
            </div>
          ))}
          {games.length === 0 && <div className="text-center py-14"><div className="text-4xl mb-3">📊</div><p className="font-bold text-gray-700">No results available</p><p className="text-gray-400 text-sm mt-1">Please check again later</p></div>}
        </div>
      </main>

      {shareOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShareOpen(false)} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <div className="flex items-center justify-between mb-5"><div><p className="font-black text-gray-800 text-lg">Share Karavali Bazar</p><p className="text-xs text-gray-400">Share the public information page</p></div><button onClick={() => setShareOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={16}/></button></div>
            <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#FF6B1A,#FF1D78)"}}><span className="text-white font-black text-sm">KB</span></div>
              <div className="flex-1 min-w-0"><p className="font-bold text-gray-800 text-sm">Karavali Bazar</p><p className="text-xs text-gray-400 truncate">{appUrl}</p></div>
              <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100"><Copy size={12}/>{copied ? "Copied!" : "Copy"}</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={copy} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-50 border border-blue-100"><Link size={24} className="text-blue-500"/><span className="text-xs font-bold text-blue-700">{copied ? "Copied!" : "Copy Link"}</span></button>
              {navigator.share && <button onClick={nativeShare} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-50 border border-purple-100"><Share2 size={24} className="text-purple-500"/><span className="text-xs font-bold text-purple-700">More</span></button>}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-2xl px-4 pt-3 pb-5">
        <div className="flex gap-2.5">
          <button onClick={() => setShareOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm border border-gray-200 text-gray-600 bg-white"><Share2 size={17}/> Share</button>
          <button onClick={() => navigate("/charts")} className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-white font-black text-base tracking-wider shadow-lg" style={{background:"linear-gradient(135deg,#FF6B1A 0%,#FF1D78 100%)"}}><BarChart2 size={19}/> VIEW CHARTS</button>
        </div>
        <p className="text-center text-xs text-gray-400 font-medium mt-2">Public information and results</p>
      </div>
    </div>
  );
};

export default LegacyHome;
