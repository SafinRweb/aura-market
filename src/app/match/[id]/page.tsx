"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Match, Pool, Bet, User, LiveFeedItem } from "@/types";
import { MarketType } from "@/types";
import AppLayout from "@/components/layout/AppLayout";
import MarketPanel from "@/components/betting/MarketPanel";
import BetModal from "@/components/betting/BetModal";
import LiveFeed from "@/components/feed/LiveFeed";
import CountdownTimer from "@/components/match/CountdownTimer";
import { formatKickoff, isMatchBettable } from "@/lib/utils";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, TrendingUp, Users, Zap, Tv, ExternalLink } from "lucide-react";
import Flag from "@/components/ui/Flag";
import Image from "next/image";
import flsTvLogo from "@/assets/flstv.png";

const MARKETS: { type: MarketType; options: { label: string; value: string }[] }[] = [
  {
    type: "match_winner",
    options: [
      { label: "Home Win", value: "home" },
      { label: "Draw", value: "draw" },
      { label: "Away Win", value: "away" },
    ],
  },
  {
    type: "over_under",
    options: [
      { label: "Over 2.5", value: "over" },
      { label: "Under 2.5", value: "under" },
    ],
  },
  {
    type: "btts",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  {
    type: "first_scorer",
    options: [
      { label: "Home Team", value: "home" },
      { label: "Away Team", value: "away" },
      { label: "No Goal", value: "none" },
    ],
  },
];

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [feed, setFeed] = useState<LiveFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{
    open: boolean;
    marketType: MarketType;
    outcome: string;
    outcomeLabel: string;
  } | null>(null);
  const [betSuccess, setBetSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/auth/login"); return; }

      const [userRes, matchRes, poolRes, betsRes, feedRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", authUser.id).single(),
        supabase.from("matches").select("*").eq("id", matchId).single(),
        supabase.from("pools").select("*").eq("match_id", matchId),
        supabase.from("bets").select("*").eq("user_id", authUser.id).eq("match_id", matchId),
        supabase.from("live_feed").select("*").limit(20),
      ]);

      setUser(userRes.data);
      setMatch(matchRes.data);
      setPools(poolRes.data || []);
      setUserBets(betsRes.data || []);
      setFeed(feedRes.data || []);
      setLoading(false);
    }
    load();

    // Realtime
    const channel = supabase
      .channel(`match-${matchId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "matches",
        filter: `id=eq.${matchId}`,
      }, (payload) => {
        setMatch(payload.new as Match);
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "pools",
        filter: `match_id=eq.${matchId}`,
      }, async () => {
        const { data } = await supabase
          .from("pools").select("*").eq("match_id", matchId);
        setPools(data || []);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bets",
      }, async () => {
        const { data } = await supabase
          .from("live_feed").select("*").limit(20);
        setFeed(data || []);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId, router]);

  function handleSelectOutcome(
    marketType: MarketType,
    outcome: string,
    outcomeLabel: string
  ) {
    if (!user) { router.push("/auth/login"); return; }
    setModalState({ open: true, marketType, outcome, outcomeLabel });
  }

  async function handleBetSuccess(stake: number) {
    setModalState(null);
    setBetSuccess(`PREDICTION PLACED! ${stake} 🤫 LOCKED IN`);
    setTimeout(() => setBetSuccess(null), 4000);

    if (!user) return;
    const [userRes, poolRes, betsRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("pools").select("*").eq("match_id", matchId),
      supabase.from("bets").select("*").eq("user_id", user.id).eq("match_id", matchId),
    ]);
    setUser(userRes.data);
    setPools(poolRes.data || []);
    setUserBets(betsRes.data || []);
  }

  // Compute total pool across all markets for the stats bar
  const totalPoolAll = pools.reduce((sum, p) => sum + p.total_staked, 0);
  const totalBettors = new Set(userBets.map(b => b.user_id)).size;

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-green-DEFAULT border-t-transparent animate-spin mb-3" style={{borderRadius: '0'}} />
          <p className="neon-green text-xs animate-pulse">LOADING MATCH...</p>
        </div>
      </div>
    </AppLayout>
  );

  if (!match) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-pink-DEFAULT text-sm">MATCH NOT FOUND</p>
      </div>
    </AppLayout>
  );

  const statusClass = match.status === "live"
    ? "status-gradient-live"
    : match.status === "upcoming"
      ? "status-gradient-upcoming"
      : "status-gradient-finished";

  return (
    <AppLayout>
      {/* Success toast */}
      {betSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-dim border-2 border-green-DEFAULT px-6 py-3 animate-slide-up"
          style={{ boxShadow: "0 0 30px rgba(0,255,135,0.4)" }}>
          <p className="text-green-DEFAULT text-sm">{betSuccess}</p>
        </div>
      )}

      {/* Bet modal */}
      {modalState?.open && user && (
        <BetModal
          match={match}
          marketType={modalState.marketType}
          outcome={modalState.outcome}
          outcomeLabel={modalState.outcomeLabel}
          pools={pools}
          userBalance={user.aura_balance}
          userId={user.id}
          onClose={() => setModalState(null)}
          onSuccess={handleBetSuccess}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-faint hover:text-green-DEFAULT text-xs mb-4 sm:mb-6 transition-colors group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-1 transition-transform" />
          BACK TO MATCHES
        </button>

        {/* ═══ Match Hero Card ═══ */}
        <div className="glass-panel hero-glow p-4 sm:p-6 mb-4 sm:mb-6 animate-slide-up overflow-hidden">

          {/* Status + Competition Bar */}
          <div className={`flex items-center justify-between mb-5 sm:mb-6 px-3 py-2 -mx-1 ${statusClass}`}>
            <span className="text-faint text-2xs sm:text-xs truncate mr-2">
              {match.competition} · {(match.group_name || match.stage || "").toUpperCase()}
            </span>
            <span className={`badge flex-shrink-0 ${match.status === "live"
                ? "text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim live-pulse"
                : match.status === "upcoming"
                  ? "text-green-DEFAULT border-green-DEFAULT bg-green-dim"
                  : "text-faint border-border"
              }`}>
              {match.status === "live" ? (
                <span className="flex items-center gap-1">
                  <span className="live-dot" /> LIVE
                </span>
              ) : match.status.toUpperCase()}
            </span>
          </div>

          {/* ── Teams Section ── */}
          <div className="flex items-center justify-between mb-5 sm:mb-6 relative" style={{ zIndex: 1 }}>

            {/* Home Team */}
            <div className="flex flex-col items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="animate-float">
                <Flag emoji={match.home_flag} size={56} alt={match.home_team} />
              </div>
              <p className="match-team-name text-white text-xs sm:text-sm text-center leading-relaxed px-1">
                {match.home_team.toUpperCase()}
              </p>
            </div>

            {/* Center: Score or Countdown */}
            <div className="flex flex-col items-center px-3 sm:px-6 flex-shrink-0">
              {match.status === "live" || match.status === "finished" ? (
                <div className="text-center">
                  <p className="match-score text-white text-2xl sm:text-3xl mb-2"
                    style={{ textShadow: match.status === "live" ? "0 0 20px rgba(255,0,110,0.4)" : "none" }}>
                    {match.home_score} <span className="text-faint">—</span> {match.away_score}
                  </p>
                  {match.status === "live" && (
                    <span className="text-pink-DEFAULT text-2xs flex items-center gap-1 justify-center">
                      <span className="live-dot" /> LIVE
                    </span>
                  )}
                  {match.status === "finished" && (
                    <span className="text-faint text-2xs">FULL TIME</span>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-faint text-xs sm:text-sm mb-2">VS</p>
                  <CountdownTimer
                    kickoffTime={match.kickoff_time}
                    status={match.status}
                  />
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="animate-float" style={{ animationDelay: "0.5s" }}>
                <Flag emoji={match.away_flag} size={56} alt={match.away_team} />
              </div>
              <p className="match-team-name text-white text-xs sm:text-sm text-center leading-relaxed px-1">
                {match.away_team.toUpperCase()}
              </p>
            </div>
          </div>

          {/* ── Match Info Row ── */}
          <div className="match-info-row flex items-center justify-center gap-4 sm:gap-6 border-t border-white/5 pt-3 sm:pt-4 flex-wrap" style={{ zIndex: 1 }}>
            <span className="flex items-center gap-2 text-faint text-2xs sm:text-xs">
              <Calendar size={11} className="text-green-DEFAULT" />
              {formatKickoff(match.kickoff_time)}
            </span>
            {match.venue && (
              <span className="flex items-center gap-2 text-faint text-2xs sm:text-xs">
                <MapPin size={11} className="text-green-DEFAULT" />
                {match.venue}
              </span>
            )}
          </div>
        </div>

        {/* ═══ Quick Stats Bar ═══ */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6 stagger">
          <div className="glass-panel p-3 text-center">
            <TrendingUp size={14} className="text-green-DEFAULT mx-auto mb-1" />
            <p className="text-white text-xs sm:text-sm">{totalPoolAll.toLocaleString()}</p>
            <p className="text-faint text-2xs mt-1">TOTAL POOL</p>
          </div>
          <div className="glass-panel p-3 text-center">
            <Users size={14} className="text-yellow-DEFAULT mx-auto mb-1" />
            <p className="text-white text-xs sm:text-sm">{totalBettors || "—"}</p>
            <p className="text-faint text-2xs mt-1">PREDICTORS</p>
          </div>
          <div className="glass-panel p-3 text-center">
            <Zap size={14} className="text-pink-DEFAULT mx-auto mb-1" />
            <p className="text-white text-xs sm:text-sm">{MARKETS.length}</p>
            <p className="text-faint text-2xs mt-1">MARKETS</p>
          </div>
        </div>

        {/* ═══ Main Content Grid ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Markets Column */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 stagger">
            {!isMatchBettable(match.status) && (
              <div className="glass-panel border-l-[3px] border-pink-DEFAULT p-4 flex items-center gap-3 animate-slide-up">
                <span className="text-pink-DEFAULT text-xl">🔒</span>
                <div>
                  <p className="text-pink-DEFAULT text-xs sm:text-sm">PREDICTIONS LOCKED</p>
                  <p className="text-faint text-2xs mt-1">
                    {match.status === "live"
                      ? "MATCH IS IN PROGRESS"
                      : "THIS MATCH HAS ENDED"}
                  </p>
                </div>
              </div>
            )}

            {MARKETS.map(market => (
              <MarketPanel
                key={market.type}
                match={match}
                marketType={market.type}
                options={market.options}
                pools={pools}
                userBet={userBets.find(b => b.market_type === market.type) || null}
                onSelect={(outcome, label) =>
                  handleSelectOutcome(market.type, outcome, label)
                }
              />
            ))}
          </div>

          {/* Match Feed Sidebar */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="live-dot" />
              <h2 className="text-white text-xs sm:text-sm">MATCH FEED</h2>
            </div>
            <LiveFeed
              items={feed.filter(f =>
                f.match_home === match.home_team &&
                f.match_away === match.away_team
              )}
            />

            {/* Live TV Promo */}
            <div className="mt-4 sm:mt-6 glass-panel border border-green-DEFAULT/30 p-4 sm:p-5 text-center group cursor-pointer hover:border-green-DEFAULT transition-colors"
                 onClick={() => window.open('https://flstv.vercel.app', '_blank')}
            >
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Image src={flsTvLogo} alt="FLS TV Logo" width={64} height={64} className="object-contain drop-shadow-[0_0_15px_rgba(0,255,135,0.5)]" />
              </div>
              <p className="text-faint text-2xs sm:text-xs mb-3 leading-relaxed">
                Catch all the action live on Football Live TV!
              </p>
              <button className="btn-pixel btn-green w-full text-2xs sm:text-xs py-2 flex items-center justify-center gap-2">
                OPEN FLS TV <ExternalLink size={12} className="-mt-[1px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
