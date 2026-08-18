import { useNavigate } from 'react-router-dom';
import { Play, BarChart2 } from 'lucide-react';
import { Game } from '@/types';

const statusColors: Record<string, string> = {
  upcoming: 'text-yellow-600 bg-yellow-50 border border-yellow-200',
  open: 'text-green-600 bg-green-50 border border-green-200',
  running_for_close: 'text-blue-600 bg-blue-50 border border-blue-200',
  closed: 'text-red-500 bg-red-50 border border-red-200',
};

const statusLabels: Record<string, string> = {
  upcoming: 'UPCOMING',
  open: 'OPEN',
  running_for_close: 'RUNNING FOR CLOSE',
  closed: 'CLOSED',
};

// Derive single digit from pana (sum of digits % 10)
const panaToSingle = (pana: string): string => {
  if (!pana || pana.length < 1) return '?';
  const sum = pana.split('').reduce((acc, d) => acc + parseInt(d || '0', 10), 0);
  return String(sum % 10);
};

interface Props { game: Game; }

const GameCard = ({ game }: Props) => {
  const navigate = useNavigate();

  // Display result: show open_pana | jodi | close_pana if available
  const displayResult = () => {
    const parts = game.current_result || '***_**_***';
    // If we have individual fields set, format them nicely
    const openP = game.open_pana || '***';
    const jodi = game.jodi || '**';
    const closeP = game.close_pana || '***';
    if (game.open_pana || game.jodi || game.close_pana) {
      return `${openP} | ${jodi} | ${closeP}`;
    }
    return parts;
  };

  const canPlay = game.status === 'open' || game.status === 'running_for_close';

  // Determine what session is available
  const sessionLabel = game.status === 'running_for_close' ? '(Close Only)' : '';

  // Compute single digits from panas
  const openSingle = game.open_pana ? panaToSingle(game.open_pana) : null;
  const closeSingle = game.close_pana ? panaToSingle(game.close_pana) : null;

  // When only open pana is declared (no full jodi yet), derive open single digit
  // and display it as partial jodi: e.g. "6*" meaning first digit of final jodi is 6
  const openSingleDigit = game.open_pana ? panaToSingle(game.open_pana) : null;
  const partialJodi = game.open_pana && !game.jodi ? `${openSingleDigit}*` : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-gray-800 text-base tracking-wide truncate">{game.name}</h3>

        {/* Result Display */}
        <div className="flex items-center gap-1 mt-1 mb-1.5">
          {game.open_pana || game.jodi || game.close_pana ? (
            <div className="flex flex-col gap-0.5 w-full">
              {/* Pana row: Open Pana | Jodi | Close Pana */}
              <div className="flex items-center gap-1">
                <span className="font-black text-lg text-orange-500">{game.open_pana || '***'}</span>
                <span className="text-gray-300 font-bold">|</span>
                <span className="font-black text-xl text-gray-900">
                  {game.jodi ? game.jodi : (partialJodi ? partialJodi : '**')}
                </span>
                <span className="text-gray-300 font-bold">|</span>
                <span className="font-black text-lg text-blue-500">{game.close_pana || '***'}</span>
              </div>
              {/* Single digit row: openSingle | jodi | closeSingle */}
              <div className="flex items-center gap-1 text-sm font-black">
                <span className="text-orange-500">
                  {openSingle !== null ? openSingle : '*'}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-800">
                  {game.jodi
                    ? game.jodi
                    : (openSingleDigit ? `${openSingleDigit}*` : '**')}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-blue-500">
                  {closeSingle !== null ? closeSingle : '*'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm font-mono tracking-widest font-bold">{game.current_result || '***_**_***'}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[game.status] || statusColors.upcoming}`}>
            {game.status === 'closed' && game.jodi ? 'RESULT DECLARED' : (statusLabels[game.status] || game.status.toUpperCase())}
          </span>
          {sessionLabel && <span className="text-xs text-blue-500 font-semibold">{sessionLabel}</span>}
          <span className="text-xs text-gray-400">OPEN: <span className="font-semibold text-gray-600">{game.open_time}</span></span>
          <span className="text-xs text-gray-400">CLOSE: <span className="font-semibold text-gray-600">{game.close_time}</span></span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate(`/game/${game.id}/play`)}
          disabled={!canPlay}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold shadow active:scale-95 transition-transform disabled:opacity-40"
          style={{ background: !canPlay ? '#ccc' : 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}
        >
          <Play size={12} fill="white" />
          Play
        </button>
        <button
          onClick={() => navigate(`/game/${game.id}/chart`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-blue-600 bg-blue-50 border border-blue-200 text-xs font-bold active:scale-95 transition-transform"
        >
          <BarChart2 size={12} />
          Chart
        </button>
      </div>
    </div>
  );
};

export default GameCard;
