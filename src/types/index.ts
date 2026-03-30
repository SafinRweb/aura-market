export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  aura_balance: number;
  total_gained: number;
  total_lost: number;
  biggest_win: number;
  total_bets: number;
  win_count: number;
  loss_count: number;
  streak: number;
  last_login: string | null;
  leaderboard_rank: number;
  push_enabled: boolean;
  fcm_token: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  kickoff_time: string;
  status: "upcoming" | "live" | "finished" | "void";
  home_score: number;
  away_score: number;
  competition: string;
  stage: "group" | "round_of_32" | "round_of_16" | "quarter" | "semi" | "third_place" | "final";
  group: string | null;
  venue: string;
  api_match_id: string | null;
}

export interface Bet {
  id: string;
  user_id: string;
  match_id: string;
  market_type: "match_winner" | "over_under" | "btts" | "first_scorer";
  outcome: string;
  stake: number;
  potential_payout: number;
  actual_payout: number | null;
  status: "pending" | "won" | "lost" | "void";
  created_at: string;
  match?: Match;
}

export interface Pool {
  id: string;
  match_id: string;
  market_type: string;
  outcome: string;
  total_staked: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "bet_won" | "bet_lost" | "bet_void" | "daily_reward" | "match_reminder";
  message: string;
  aura_change: number;
  is_read: boolean;
  created_at: string;
}

export interface DailyStreak {
  user_id: string;
  last_claimed: string | null;
  current_streak: number;
  total_claimed: number;
}

export interface LiveFeedItem {
  id: string;
  username: string;
  avatar_url: string | null;
  match_home: string;
  match_away: string;
  market_type: string;
  outcome: string;
  stake: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  aura_balance: number;
  total_bets: number;
  win_count: number;
  loss_count: number;
}

export type MarketType = "match_winner" | "over_under" | "btts" | "first_scorer";

export type BetOutcome = {
  label: string;
  value: string;
  odds: number;
};