"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LiveFeedItem, Match, LeaderboardEntry } from "@/types";
import Navbar from "@/components/layout/Navbar";
import LiveFeed from "@/components/feed/LiveFeed";
import MatchCard from "@/components/match/MatchCard";
import { formatAura, rankBadge } from "@/lib/utils";
import { Zap, Trophy, Lock } from "lucide-react";
import Link from "next/link";
import AuraCoin from "@/components/ui/AuraCoin";

export default function LandingPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [feed, setFeed] = useState<LiveFeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {

        router.push("/dashboard");
        return;
      }

      // Load public data
      const [matchRes, feedRes, lbRes] = await Promise.all([
        supabase.from("matches").select("*")
          .in("status", ["upcoming", "live"])
          .order("kickoff_time", { ascending: true })
          .limit(6),
        supabase.from("live_feed").select("*").limit(20),
        supabase.from("leaderboard").select("*").limit(10),
      ]);

      setMatches(matchRes.data || []);
      setFeed(feedRes.data || []);
      setLeaderboard(lbRes.data || []);
      setLoading(false);
    }
    load();

    // Realtime feed
    const channel = supabase
      .channel("landing-feed")
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
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="neon-green text-lg animate-pulse">LOADING...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg crt">
      <Navbar />
      <main className="pt-16">

        {/* Hero */}
        <section className="relative px-5 py-20 text-center overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Kept clean as requested - boxes were distracting */}
          </div>

          <div className="relative stagger z-10">
            <p className="text-faint text-sm mb-4 tracking-widest">
              2026 FIFA WORLD CUP
            </p>
            <h1 className="text-white text-xl sm:text-2xl mb-6 leading-loose flex items-center justify-center flex-wrap gap-2 text-center w-full uppercase">
              GIVE PREDICTION & TEST YOUR <AuraCoin size={80} className="-translate-y-[4px]" />
            </h1>
            <p className="text-muted text-sm mb-3 max-w-lg mx-auto leading-loose">
              THE ULTIMATE FOOTBALL PREDICTION MARKET
            </p>
            <p className="text-faint text-sm mb-10 max-w-lg mx-auto leading-loose">
              Don&apos;t let your friends say, <br />&quot;Tui to football ar F o janos na!&quot; <br />Show them your AURA.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap w-full">
              <Link href="/auth/signup" className="btn-pixel btn-green text-sm px-8 py-4 w-full sm:w-auto">
                JOIN FREE & GET 100<AuraCoin size={30} />
              </Link>
              <Link href="/auth/login" className="btn-pixel btn-ghost text-sm px-8 py-4 w-full sm:w-auto">
                LOGIN
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-16 stagger">
            {[
              { label: "STARTING AURA", value: "100", color: "text-green-DEFAULT", showCoin: true },
              { label: "AURA CAP", value: "Infinite", color: "text-yellow-DEFAULT" },
              { label: "ENTRY FEE", value: "FREE", color: "text-pink-DEFAULT" },
            ].map(stat => (
              <div key={stat.label} className="card p-4">
                <p className="text-faint text-xs mb-2">{stat.label}</p>
                <p className={`${stat.color} text-sm inline-flex items-center gap-1 justify-center`}>
                  {stat.value}
                  {'showCoin' in stat && <AuraCoin size={30} />}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="pixel-divider mx-5" />

        {/* Upcoming matches */}
        <section className="px-5 py-10 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
              <Zap size={16} className="text-yellow-DEFAULT shrink-0" />
              <h2 className="text-white text-lg">UPCOMING MATCHES</h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-pink-dim border-2 border-pink-DEFAULT self-start sm:self-auto">
              <Lock size={11} className="text-pink-DEFAULT shrink-0" />
              <span className="text-pink-DEFAULT text-xs">LOGIN TO BET</span>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-faint text-sm">MATCHES COMING SOON</p>
              <p className="text-faint text-xs mt-3">WORLD CUP KICKS OFF JUNE 2026</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              {matches.map(match => (
                <div key={match.id} className="relative">
                  <MatchCard match={match} />
                  {/* Login overlay on hover */}
                  <div className="absolute inset-0 bg-bg opacity-0 hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => router.push("/auth/login")}>
                    <div className="text-center">
                      <Lock size={20} className="text-green-DEFAULT mx-auto mb-2" />
                      <p className="text-green-DEFAULT text-xs">LOGIN TO BET</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="pixel-divider mx-5" />

        {/* Live feed + Leaderboard */}
        <section className="px-5 py-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Live feed */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="live-dot" />
                <h2 className="text-white text-lg">LIVE BET FEED</h2>
              </div>
              <LiveFeed items={feed} />
            </div>

            {/* Leaderboard preview */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Trophy size={16} className="text-yellow-DEFAULT" />
                  <h2 className="text-white text-lg">TOP PLAYERS</h2>
                </div>
                <Link href="/leaderboard" className="text-green-DEFAULT text-xs hover:underline">
                  VIEW ALL →
                </Link>
              </div>

              <div className="card p-0 overflow-hidden">
                {leaderboard.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-faint text-sm">NO PLAYERS YET</p>
                    <p className="text-faint text-xs mt-2">BE THE FIRST TO JOIN</p>
                  </div>
                ) : (
                  leaderboard.map((entry, i) => (
                    <div key={entry.user_id}
                      className="flex items-center gap-4 p-4 border-b-2 border-border hover:bg-surface2 transition-colors">
                      {/* Rank */}
                      <div className={`w-10 text-center text-sm font-bold flex-shrink-0
                        ${i === 0 ? "text-yellow-DEFAULT" : i === 1 ? "text-muted" : i === 2 ? "text-pink-DEFAULT" : "text-faint"}`}>
                        #{entry.rank}
                      </div>

                      {/* Avatar */}
                      <div className="w-8 h-8 bg-surface2 border-2 border-border flex items-center justify-center flex-shrink-0">
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-green-DEFAULT text-xs">
                            {entry.username?.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name + badge */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                        <p className="text-white text-sm truncate leading-none">{entry.username?.toUpperCase()}</p>
                        {rankBadge(Number(entry.rank)) && (
                          <p className="text-yellow-DEFAULT text-2xs leading-none">
                            {rankBadge(Number(entry.rank))}
                          </p>
                        )}
                      </div>

                      {/* Balance */}
                      <div className="text-right flex flex-col justify-center gap-2">
                        <p className="text-green-DEFAULT text-sm inline-flex items-center justify-end gap-1.5 leading-none">
                          <span className="translate-y-[1px]">{formatAura(entry.aura_balance)}</span>
                          <AuraCoin size={30} />
                        </p>
                        <p className="text-faint text-2xs leading-none">{entry.win_count}W / {entry.loss_count}L</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="pixel-divider mx-5" />

        {/* CTA Footer */}
        <section className="px-5 py-16 text-center">
          <div className="max-w-xl mx-auto stagger">
            <p className="text-faint text-sm mb-4">READY TO PROVE YOUR KNOWLEDGE?</p>
            <h2 className="neon-green text-2xl mb-8 leading-loose">JOIN THE MARKET</h2>
            <Link href="/auth/signup" className="btn-pixel btn-green text-sm px-6 sm:px-10 py-4 block sm:inline-block w-full sm:w-auto">
              <span className="inline-flex items-center gap-1">
                CREATE FREE ACCOUNT → 100 <AuraCoin size={30} /> FREE
              </span>
            </Link>
          </div>
        </section>

      </main>
    </div >
  );
}