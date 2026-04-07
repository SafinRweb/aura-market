import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import { MarketType } from "../types";

// FIFA ranking based strength ratings for all 48 teams
// Lower number = stronger team = lower odds
const TEAM_STRENGTH: Record<string, number> = {
  // Top tier
  "Spain": 1, "France": 2, "Argentina": 3, "England": 4,
  "Brazil": 5, "Portugal": 6, "Netherlands": 7, "Belgium": 8,
  "Germany": 9, "Croatia": 10, "Uruguay": 11, "Colombia": 12,
  "Morocco": 13, "USA": 14, "Mexico": 15, "Japan": 16,
  // Mid tier
  "South Korea": 17, "Australia": 18, "Switzerland": 19,
  "Austria": 20, "Turkey": 21, "Turkiye": 21, "Norway": 22,
  "Sweden": 23, "Czechia": 24, "Ecuador": 25, "Senegal": 26,
  "Canada": 27, "Scotland": 28, "Algeria": 29, "Tunisia": 30,
  "Paraguay": 31, "Qatar": 32, "South Africa": 33, "Egypt": 34,
  "Ivory Coast": 35, "Ghana": 36, "Panama": 37,
  // Lower tier
  "Iran": 39, "Saudi Arabia": 40, "Serbia": 41,
  "Bosnia and Herzegovina": 42, "New Zealand": 43,
  "Jordan": 44, "Uzbekistan": 45, "Cape Verde": 46,
  "Curacao": 47, "Haiti": 48, "DR Congo": 49, "Iraq": 50,
};

export function getTeamStrength(team: string): number {
  return TEAM_STRENGTH[team] || 35; // Default mid-lower tier
}

// Generate realistic seed pools for a match
export function generateSeedPools(
  homeTeam: string,
  awayTeam: string,
  totalSeed: number = 1000
): Record<string, Record<string, number>> {
  const homeStrength = getTeamStrength(homeTeam);
  const awayStrength = getTeamStrength(awayTeam);

  // Calculate raw weights — lower rank number = more weight
  const homeWeight = 1 / homeStrength;
  const awayWeight = 1 / awayStrength;
  const drawWeight = 0.28; // Draw is always ~25-30% in football

  const totalWeight = homeWeight + awayWeight + drawWeight;

  // Normalize to percentages
  const homePercent = homeWeight / totalWeight;
  const awayPercent = awayWeight / totalWeight;
  const drawPercent = drawWeight / totalWeight;

  // Over/Under — slightly favor under in most matches
  const overPercent = 0.48;
  const underPercent = 0.52;

  // BTTS — roughly 50/50 with slight lean to No
  const bttsYesPercent = 0.46;
  const bttsNoPercent = 0.54;

  // First scorer — home team slightly favored
  const firstScorerHome = homePercent * 0.9;
  const firstScorerAway = awayPercent * 0.9;
  const firstScorerNone = 0.08; // ~8% chance of 0-0

  return {
    match_winner: {
      home: Math.floor(totalSeed * homePercent),
      draw: Math.floor(totalSeed * drawPercent),
      away: Math.floor(totalSeed * awayPercent),
    },
    over_under: {
      over: Math.floor(totalSeed * overPercent),
      under: Math.floor(totalSeed * underPercent),
    },
    btts: {
      yes: Math.floor(totalSeed * bttsYesPercent),
      no: Math.floor(totalSeed * bttsNoPercent),
    },
    first_scorer: {
      home: Math.floor(totalSeed * firstScorerHome),
      away: Math.floor(totalSeed * firstScorerAway),
      none: Math.floor(totalSeed * firstScorerNone),
    },
  };
}

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

// Day-based streak reward tiers (resets weekly)
export const STREAK_ROADMAP = [
  { day: 1, reward: 10 },
  { day: 2, reward: 10 },
  { day: 3, reward: 20 },
  { day: 4, reward: 20 },
  { day: 5, reward: 30 },
  { day: 6, reward: 30 },
  { day: 7, reward: 100 }, // Weekly milestone
];

export function streakReward(streak: number): number {
  // Streak loops weekly; always work within cycle of 7
  const day = ((streak - 1) % 7) + 1;
  return STREAK_ROADMAP.find(r => r.day === day)?.reward ?? 10;
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