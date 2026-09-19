import { useEffect, useState } from "react";
import { BarChart2, Bell, Calendar, ChevronRight, Clock, RefreshCw, Share2, X } from "lucide-react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import ChartPage from "./pages/ChartPage";
import ChartsListPage from "./pages/ChartsListPage";
import NotFound from "./pages/NotFound";

type Game = {
  id: string;
  name: string;
  open_time?: string;
  close_time?: string;
  status?: string;
  open_pana?: string;
  jodi?: string;
  close_pana?: string;
  current_result?: string;
};

function SafeHome() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [now, setNow] = useState(new Date());
  const [shareOpen, setShareOpen] = useState(false);

  const load = async () => {
    const { data: gamesData } = await supabase.from("games").select("*").eq("is_active", true).order("sort_order");
    if (gamesData) setGames(gamesData as Game[]);
    const { data: settingsData } = await supabase.from("settings").select("*");
    const item = (settingsData || []).find((x: any) => x.key === "announcement");
    setAnnouncement(item?.value || "");
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(load, 30000);
    return () => { clearInterval(timer); clearInterval(refresh); };
  }, []);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "Karavali Bazar", text: "Karavali Bazar information and result charts", url });
    } else {
      await navigator.clipboard?.writeText(url);
      alert("Link copied");
    }
    setShareOpen(false);
  };

  const statusClass: Record<string,string> = {
    upcoming: "text-yellow-600 bg-yellow-50 border-yellow-200",
    open: "text-green-600 bg-green-50 border-green-200",
    closed: "text-red-500 bg-red-50 border-red-200"
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="sticky top-0 z-30" style={{background:"linear-gradient(135deg,#FF6B1A 0%,#FF1D78 100%)"}}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-sm">KB</span>
            </div>
            <div>
              <p className="text-white font-black text-lg tracking-wider leading-none">KARAVALI BAZAR</p>
              <p className="text-white/75 text-[10px] font-medium">Information & Results</p>
            </div>
          </div>
          <button onClick={() => setShareOpen(true)} className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
            <Share2 size={14} className="text-white"/><span className="text-white text-xs font-bold">Share</span>
          </button>
        </div>
      </header>

      {announcement && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Bell size={15} className="text-amber-600"/><p className="text-amber-700 text-sm font-medium">{announcement}</p>
        </div>
      )}

      <div className="bg-orange-50 border-b border-orange-100 py-1.5 overflow-hidden">
        <div className="whitespace-nowrap text-orange-600 text-sm font-semibold text-center px-4">
          🎉 WELCOME TO KARAVALI BAZAR • PUBLIC UPDATES & RESULTS
        </div>
      </div>

      <main className="px-4 pt-3 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><Calendar size={15} className="text-orange-500"/><span className="text-sm font-semibold text-gray-700">{now.toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</span></div>
          <div className="flex items-center gap-1.5 bg-orange-50 rounded-xl px-2.5 py-1"><Clock size={13} className="text-orange-500"/><span className="text-sm font-bold text-orange-600 font-mono">{now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true})}</span></div>
        </div>

        <div className="rounded-2xl p-4 shadow-sm" style={{background:"linear-gradient(135deg,#FF6B1A 0%,#FF1D78 100%)"}}>
          <div className="flex items-center gap-2 mb-2"><Bell size={15} className="text-white"/><span className="text-white font-black text-sm tracking-widest">NOTICE BOARD</span></div>
          <div className="bg-white/20 rounded-xl px-3 py-2.5"><p className="text-white text-sm font-medium">{announcement || "Welcome to Karavali Bazar."}</p></div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2"><BarChart2 size={18} className="text-orange-500"/><span className="font-black text-gray-800 text-base">RESULTS & CHARTS</span></div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs"><RefreshCw size={11}/><span>Auto-updates</span></div>
        </div>

        <div className="space-y-3">
          {games.map(game => (
            <div key={game.id} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <div><h3 className="font-black text-gray-800 text-base tracking-wide">{game.name}</h3><div className="flex gap-2 mt-0.5 text-xs text-gray-400"><span>OPEN: {game.open_time || "-"}</span><span>|</span><span>CLOSE: {game.close_time || "-"}</span></div></div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusClass[game.status || "upcoming"] || statusClass.upcoming}`}>{(game.status || "upcoming").toUpperCase()}</span>
              </div>
              <div className="mx-4 mb-3 rounded-xl py-4 px-3 flex items-center justify-center" style={{background:"linear-gradient(135deg,#fff5f0 0%,#fff0f8 100%)",border:"1px solid #ffe0d0"}}>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold mb-1 tracking-widest">RESULT</p>
                  <span className="font-black text-3xl text-gray-700 tracking-[0.2em] font-mono">{game.current_result || "---"}</span>
                </div>
              </div>
              <button onClick={() => navigate(`/game/${game.id}/chart`)} className="w-full flex items-center justify-center gap-2 py-3 border-t border-gray-100 text-blue-600 text-sm font-bold">
                <BarChart2 size={16}/> View Chart <ChevronRight size={14}/>
              </button>
            </div>
          ))}
          {!games.length && <div className="bg-white rounded-2xl p-10 text-center text-gray-500">No public results available right now.</div>}
        </div>
      </main>

      {shareOpen && <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setShareOpen(false)}>
        <div className="bg-white w-full rounded-t-3xl p-5" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between mb-4"><p className="font-black text-lg">Share Karavali Bazar</p><button onClick={() => setShareOpen(false)}><X size={18}/></button></div>
          <button onClick={share} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold">Share / Copy Link</button>
        </div>
      </div>}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename="/KaravaliBazar">
      <Routes>
        <Route path="/" element={<SafeHome/>}/>
        <Route path="/charts" element={<ChartsListPage/>}/>
        <Route path="/game/:id/chart" element={<ChartPage/>}/>
        <Route path="*" element={<NotFound/>}/>
      </Routes>
    </BrowserRouter>
  );
}
export default App;
