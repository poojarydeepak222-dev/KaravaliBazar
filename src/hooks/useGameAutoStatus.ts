/**
 * Auto-manages game status based on configurable market_open_time, open_time, close_time.
 *
 * Daily cycle per game:
 *   UPCOMING  →(market_open_time)→  OPEN  →(open_time)→  RUNNING_FOR_CLOSE  →(close_time)→  CLOSED
 *   Next day at market_open_time: resets to OPEN automatically.
 *
 * Result fields (open_pana / jodi / close_pana) are NEVER cleared by this hook
 * so the public landing page keeps showing yesterday's result until admin declares a new one.
 */

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/** Parse "HH:MM AM/PM" into a Date for today */
const parseGameTime = (timeStr: string): Date => {
  const now = new Date();
  const trimmed = (timeStr || '').trim();
  const parts = trimmed.split(' ');
  const timePart = parts[0] || '00:00';
  const period = (parts[1] || 'AM').toUpperCase();
  const [hoursRaw, minutes] = timePart.split(':').map(Number);
  let hours = hoursRaw || 0;
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes || 0, 0, 0);
};

export const useGameAutoStatus = () => {
  const checkAndUpdateGameStatus = useCallback(async () => {
    const { data: games } = await supabase
      .from('games')
      .select('id, name, market_open_time, open_time, close_time, status')
      .eq('is_active', true);

    if (!games || games.length === 0) return;

    const now = new Date();
    for (const game of games) {
      await applyTimeBasedStatus(game, now);
    }
  }, []);

  useEffect(() => {
    checkAndUpdateGameStatus();
    const interval = setInterval(checkAndUpdateGameStatus, 60_000); // check every 60s
    return () => clearInterval(interval);
  }, [checkAndUpdateGameStatus]);
};

async function applyTimeBasedStatus(
  game: { id: string; market_open_time?: string; open_time: string; close_time: string; status: string },
  now: Date
) {
  const marketOpenTime = parseGameTime(game.market_open_time || '05:00 AM');
  const openTime      = parseGameTime(game.open_time);
  const closeTime     = parseGameTime(game.close_time);
  const todayStr      = now.toDateString();

  // localStorage key tracks when this game was last "opened" (daily reset detection)
  const openedKey = `kb_game_opened_${game.id}`;
  const lastOpenedDate = localStorage.getItem(openedKey);

  // ── PHASE 1: Before market opens → UPCOMING ──────────────────────────────
  if (now < marketOpenTime) {
    if (game.status !== 'upcoming') {
      await supabase.from('games').update({ status: 'upcoming' }).eq('id', game.id);
    }
    return;
  }

  // ── DAILY RESET: market_open_time passed & not yet opened today ───────────
  // Handles the transition from the previous day's CLOSED back to OPEN.
  if (lastOpenedDate !== todayStr) {
    // Reset status and current_result display — DO NOT clear open_pana/jodi/close_pana
    // (public landing page reads those directly and keeps showing them until next declare)
    const shouldReset = game.status === 'closed' || game.status === 'running_for_close';
    if (shouldReset || game.status === 'upcoming') {
      await supabase.from('games').update({
        status: 'open',
        current_result: '***_**_***',
      }).eq('id', game.id);
    }
    localStorage.setItem(openedKey, todayStr);
    return;
  }

  // ── PHASE 2: market_open_time ≤ now < open_time → OPEN (both bids allowed) ──
  if (now >= marketOpenTime && now < openTime) {
    if (game.status === 'upcoming') {
      await supabase.from('games').update({ status: 'open' }).eq('id', game.id);
    }
    return;
  }

  // ── PHASE 3: open_time ≤ now < close_time → RUNNING FOR CLOSE ─────────────
  if (now >= openTime && now < closeTime) {
    if (game.status === 'open' || game.status === 'upcoming') {
      await supabase.from('games').update({ status: 'running_for_close' }).eq('id', game.id);
    }
    return;
  }

  // ── PHASE 4: now ≥ close_time → CLOSED ────────────────────────────────────
  if (now >= closeTime && game.status !== 'closed') {
    await supabase.from('games').update({ status: 'closed' }).eq('id', game.id);
  }
}
