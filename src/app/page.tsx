"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LiveFeedItem, Match, LeaderboardEntry } from "@/types";
import LiveFeed from "@/components/feed/LiveFeed";
import MatchCard from "@/components/match/MatchCard";
import { formatAura, rankBadge } from "@/lib/utils";
import { Zap, Trophy, Lock, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import AuraCoin from "@/components/ui/AuraCoin";
import flsTvLogo from "@/assets/flstv.png";

export default function LandingPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [feed, setFeed] = useState<LiveFeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Check auth — but don't redirect, just set state
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsLoggedIn(true);

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
      <main className="pt-16 flex flex-col lg:block">

        {/* Hero */}
        <section className="relative px-4 py-14 sm:py-20 text-center overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Kept clean as requested - boxes were distracting */}
          </div>

          <div className="relative stagger z-10">
            <p className="text-faint text-xs mb-3 tracking-widest">
              2026 FIFA WORLD CUP
            </p>
            <h1 className="text-white text-base sm:text-xl mb-4 leading-loose flex items-center justify-center flex-wrap gap-2 text-center w-full uppercase">
              GIVE PREDICTION &amp; TEST YOUR <AuraCoin size={60} className="-translate-y-[3px]" />
            </h1>
            <p className="text-muted text-xs mb-2 max-w-sm mx-auto leading-loose">
              THE ULTIMATE FOOTBALL PREDICTION MARKET
            </p>
            <p className="text-faint text-xs mb-8 max-w-sm mx-auto leading-loose">
              Predict the outcome of matches and Become AURA GOD.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap w-full">
              {isLoggedIn ? (
                <Link href="/dashboard" className="btn-pixel btn-green w-full sm:w-auto px-8 py-5 text-base sm:text-lg animate-pulse flex items-center justify-center gap-2">
                  GO TO DASHBOARD <ArrowRight size={16} className="-mt-[2px]" />
                </Link>
              ) : (
                <>
                  <Link href="/auth/signup" className="btn-pixel btn-green w-full sm:w-auto px-8 py-4 mb-2 flex items-center justify-center flex-wrap gap-2">
                    CREATE FREE ACCOUNT <ArrowRight size={16} className="hidden sm:block -mt-[2px]" />
                  </Link>
                  <Link href="/auth/login" className="btn-pixel btn-ghost text-sm px-8 py-4 w-full sm:w-auto">
                    LOGIN
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-12 sm:mt-16 stagger">
            <div className="flex items-center gap-2">
              <Lock className="text-pink-DEFAULT hidden sm:block" size={14} />
              <span className="text-faint text-xs">100% FREE TO PLAY</span>
            </div>
            <span className="text-border hidden sm:block">•</span>
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-DEFAULT hidden sm:block" size={14} />
              <span className="text-faint text-xs">GLOBAL LEADERBOARD</span>
            </div>
            <span className="text-border hidden sm:block">•</span>
            <div className="flex items-center gap-2">
              <span className="text-faint text-xs">EARN AURA POINTS</span>
            </div>
          </div>
        </section>

        <div className="pixel-divider mx-5" />

        {/* Featured matches */}
        <section className="px-5 py-20 max-w-7xl mx-auto w-full order-3 lg:order-none">
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
              <p className="text-faint text-xs">MATCHES COMING SOON</p>
              <p className="text-faint text-xs mt-3">WORLD CUP KICKS OFF JUNE 2026</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              {matches.map(match => (
                <div key={match.id} className="relative">
                  <MatchCard match={match} />
                  {/* Login overlay on hover */}
                  <div className="absolute inset-0 bg-bg opacity-0 hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => router.push("/auth/login")}>
                    <div className="text-center">
                      <Lock size={20} className="text-green-DEFAULT mx-auto mb-2" />
                      <p className="text-green-DEFAULT text-xs">LOGIN TO PREDICT</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>



        {/* Live feed + Leaderboard */}
        <section className="px-5 py-10 max-w-7xl mx-auto w-full order-2 lg:order-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Live feed */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="live-dot" />
                <h2 className="text-white text-lg">LIVE PREDICTION FEED</h2>
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
                <Link href="/leaderboard" className="text-green-DEFAULT text-xs hover:underline flex items-center gap-1">
                  VIEW ALL <ArrowRight size={12} className="-mt-[2px]" />
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
                    <div
                      key={entry.user_id}
                      className="flex items-center gap-2 px-3 py-3 border-b-2 border-border last:border-b-0 hover:bg-surface2 transition-colors"
                    >
                      {/* Rank medal */}
                      <div className={`w-7 text-center text-xs font-bold flex-shrink-0 ${i === 0 ? "text-yellow-DEFAULT" : i === 1 ? "text-muted" : i === 2 ? "text-pink-DEFAULT" : "text-faint"
                        }`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}
                      </div>

                      {/* Avatar */}
                      <div className="w-7 h-7 bg-surface2 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {entry.avatar_url ? (
                          <Image src={entry.avatar_url} alt="Avatar" width={28} height={28} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-green-DEFAULT" style={{ fontSize: "9px" }}>
                            {entry.username?.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs truncate">{entry.username?.toUpperCase()}</p>
                        {rankBadge(Number(entry.rank)) && (
                          <p className="text-yellow-DEFAULT" style={{ fontSize: "8px" }}>
                            {rankBadge(Number(entry.rank))}
                          </p>
                        )}
                      </div>

                      {/* Balance — compact */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-green-DEFAULT text-xs">{formatAura(entry.aura_balance)}</span>
                        <AuraCoin size={16} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="pixel-divider mx-5 order-4 lg:order-none" />

        {/* Live TV Promo block moved to bottom */}
        <section className="px-5 py-12 max-w-7xl mx-auto w-full order-5 lg:order-none mt-10">
          <div className="card p-8 sm:p-12 border-green-DEFAULT/50 bg-green-dim/10 flex flex-col md:flex-row items-center justify-between gap-8 animate-slide-up">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className="w-20 h-20 flex items-center justify-center -ml-2">
                  <Image src={flsTvLogo} alt="FLS TV Logo" width={80} height={80} className="object-contain drop-shadow-[0_0_15px_rgba(0,255,135,0.5)]" />
                </div>
              </div>
              <p className="text-white text-sm sm:text-base leading-loose mb-3">
                Watch all world cup matches LIVE in ultra high definition.
              </p>
              <p className="text-faint text-xs leading-relaxed max-w-xl md:mx-0 mx-auto">
                Why not give it a try? FlsTV is the ultimate companion to Aura Market. Predict the games here, and watch the thrilling results unfold live!
              </p>
            </div>
            <div className="flex-shrink-0">
              <button onClick={() => window.open('https://flstv.vercel.app', '_blank')} className="btn-pixel btn-green px-8 py-4 text-sm flex items-center gap-2 w-full sm:w-auto justify-center">
                WATCH MATCHES LIVE <ExternalLink size={16} className="-mt-[2px]" />
              </button>
            </div>
          </div>
        </section>

        <div className="pixel-divider mx-5 order-6 lg:order-none hidden sm:block" />

        {/* CTA Footer */}
        <section className="px-5 py-16 text-center order-7 lg:order-none">
          <div className="max-w-xl mx-auto stagger">
            <p className="text-faint text-sm mb-4">READY TO PROVE YOUR KNOWLEDGE?</p>
            <h2 className="neon-green text-2xl mb-8 leading-loose">JOIN THE MARKET</h2>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="btn-pixel btn-green text-sm px-6 sm:px-10 py-4 w-full sm:w-auto inline-flex items-center justify-center gap-2"
              >
                GO TO DASHBOARD <ArrowRight size={14} className="-mt-[2px]" />
              </Link>
            ) : (
              <Link
                href="/auth/signup"
                className="btn-pixel btn-green text-sm px-6 sm:px-10 py-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 flex-wrap"
              >
                CREATE FREE ACCOUNT <ArrowRight size={14} className="-mt-[2px]" />
                <span className="inline-flex items-center gap-1">
                  100 <AuraCoin size={18} /> FREE
                </span>
              </Link>
            )}
          </div>
        </section>

      </main>
    </div >
  );
}