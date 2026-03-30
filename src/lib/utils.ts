import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import { MarketType } from "../types";

// Format aura amount (number only — pair with <AuraCoin /> for the icon)
export function formatAura(amount: number): string {
  return amount.toLocaleString();
}

// Calculate pari-mutuel payout
// stake / totalOnWinningSide * totalPool
export function calcPayout(
  stake: number,
  totalWinningSide: number,
  totalPool: number
): number {
  if (totalWinningSide === 0) return stake;
  return Math.floor((stake / totalWinningSide) * totalPool);
}

// Time until kickoff formatted
export function timeUntilKickoff(kickoff: string): string {
  const diff = differenceInSeconds(new Date(kickoff), new Date());
  if (diff <= 0) return "STARTED";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Check if match can be bet on
export function isMatchBettable(status: string): boolean {
  return status === "upcoming";
}

// Format kickoff date
export function formatKickoff(kickoff: string): string {
  return format(new Date(kickoff), "dd MMM yyyy · HH:mm");
}

// Time ago
export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// Validate stake amount
export function validateStake(
  stake: number,
  balance: number
): string | null {
  if (!Number.isInteger(stake)) return "Whole numbers only — no decimals";
  if (stake < 5) return "Minimum bid is 5 Aura";
  if (stake > balance) return "Not enough Aura in your balance";
  return null;
}

// Market type display label
export function marketLabel(type: MarketType): string {
  const labels: Record<MarketType, string> = {
    match_winner: "Match Winner",
    over_under: "Over / Under 2.5",
    btts: "Both Teams to Score",
    first_scorer: "First Goal Scorer",
  };
  return labels[type];
}

// Get streak reward amount
export function streakReward(streak: number): number {
  if (streak >= 30) return 200;
  if (streak >= 14) return 100;
  if (streak >= 7) return 50;
  if (streak >= 3) return 25;
  return 10;
}

// Truncate username
export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + "..." : str;
}

// Win rate percentage
export function winRate(wins: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((wins / total) * 100)}%`;
}

// Rank badge label
export function rankBadge(rank: number): string | null {
  if (rank === 1) return "AURA GOD";
  if (rank === 2) return "AURA LORD";
  if (rank === 3) return "AURA KING";
  return null;
}