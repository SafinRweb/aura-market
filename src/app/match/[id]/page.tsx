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
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import Flag from "@/components/ui/Flag";

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

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-screen">
        <p className="neon-green text-sm animate-pulse">LOADING MATCH...</p>
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

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-faint hover:text-white text-xs mb-6 transition-colors"
        >
          <ArrowLeft size={13} />
          BACK
        </button>

        {/* Match header */}
        <div className="card p-6 mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <span className="text-faint text-xs">
              {match.competition} · {(match.group || match.stage || "").toUpperCase()}
            </span>
            <span className={`badge ${match.status === "live"
                ? "text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim"
                : match.status === "upcoming"
                  ? "text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim"
                  : "text-faint border-border"
              }`}>
              {match.status === "live" ? (
                <span className="flex items-center gap-1">
                  <span className="live-dot" /> LIVE
                </span>
              ) : match.status.toUpperCase()}
            </span>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col items-center gap-3 flex-1">
              <Flag emoji={match.home_flag} size={72} alt={match.home_team} />
              <p className="text-white text-sm text-center leading-loose">
                {match.home_team.toUpperCase()}
              </p>
            </div>

            <div className="flex flex-col items-center px-6">
              {match.status === "live" || match.status === "finished" ? (
                <div className="text-center">
                  <p className="text-white text-3xl mb-2">
                    {match.home_score} — {match.away_score}
                  </p>
                  {match.status === "live" && (
                    <span className="text-pink-DEFAULT text-xs flex items-center gap-1 justify-center">
                      <span className="live-dot" /> LIVE
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-faint text-sm mb-2">VS</p>
                  <CountdownTimer
                    kickoffTime={match.kickoff_time}
                    status={match.status}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 flex-1">
              <Flag emoji={match.away_flag} size={72} alt={match.away_team} />
              <p className="text-white text-sm text-center leading-loose">
                {match.away_team.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Match info */}
          <div className="flex items-center justify-center gap-6 border-t-2 border-border pt-4 flex-wrap">
            <span className="flex items-center gap-2 text-faint text-xs">
              <Calendar size={11} />
              {formatKickoff(match.kickoff_time)}
            </span>
            {match.venue && (
              <span className="flex items-center gap-2 text-faint text-xs">
                <MapPin size={11} />
                {match.venue}
              </span>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Markets */}
          <div className="lg:col-span-2 space-y-4">
            {!isMatchBettable(match.status) && (
              <div className="bg-pink-dim border-2 border-pink-DEFAULT p-4 flex items-center gap-3">
                <span className="text-pink-DEFAULT text-xl">🔒</span>
                <div>
                  <p className="text-pink-DEFAULT text-sm">PREDICTIONS LOCKED</p>
                  <p className="text-faint text-xs mt-1">
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

          {/* Match feed */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="live-dot" />
              <h2 className="text-white text-sm">MATCH FEED</h2>
            </div>
            <LiveFeed
              items={feed.filter(f =>
                f.match_home === match.home_team &&
                f.match_away === match.away_team
              )}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
