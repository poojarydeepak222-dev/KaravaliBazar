export interface AppUser {
  id: string;
  mobile: string;
  name: string;
  password: string;
  mpin: string;
  balance: number;
  total_deposited: number;
  total_withdrawn: number;
  role: 'user' | 'admin' | 'agent';
  is_active: boolean;
  created_at: string;
}

export interface Game {
  id: string;
  name: string;
  open_time: string;
  close_time: string;
  status: 'upcoming' | 'open' | 'running_for_close' | 'closed';
  current_result: string;
  open_pana: string | null;
  jodi: string | null;
  close_pana: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Bid {
  id: string;
  user_id: string;
  game_id: string;
  game_name: string;
  bid_type: string;
  number: string;
  amount: number;
  session: string;
  status: 'pending' | 'won' | 'lost';
  won_amount: number;
  created_at: string;
  app_users?: { name: string; mobile: string };
}

export interface ChartResult {
  id: string;
  game_id: string;
  week_start: string;
  week_end: string;
  mon_result: string | null;
  tue_result: string | null;
  wed_result: string | null;
  thu_result: string | null;
  fri_result: string | null;
  sat_result: string | null;
  sun_result: string | null;
  mon_open: string | null; mon_jodi: string | null; mon_close: string | null;
  tue_open: string | null; tue_jodi: string | null; tue_close: string | null;
  wed_open: string | null; wed_jodi: string | null; wed_close: string | null;
  thu_open: string | null; thu_jodi: string | null; thu_close: string | null;
  fri_open: string | null; fri_jodi: string | null; fri_close: string | null;
  sat_open: string | null; sat_jodi: string | null; sat_close: string | null;
  sun_open: string | null; sun_jodi: string | null; sun_close: string | null;
  created_at: string;
}

export interface Deposit {
  id: string;
  user_id: string;
  user_name: string;
  user_mobile: string;
  amount: number;
  upi_ref: string;
  upi_id: string;
  screenshot_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  user_name: string;
  user_mobile: string;
  amount: number;
  upi_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface ForumPost {
  id: string;
  user_id: string;
  user_name: string;
  game_id: string | null;
  game_name: string | null;
  content: string;
  likes: number;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  created_at: string;
}
