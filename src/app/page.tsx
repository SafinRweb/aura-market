"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LiveFeedItem, Match, LeaderboardEntry } from "@/types";
import LiveFeed from "@/components/feed/LiveFeed";
import MatchCard from "@/components/match/MatchCard";
import { formatAura } from "@/lib/utils";
import { Zap, Trophy, Lock, ArrowRight, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import AuraPoints from "@/components/ui/AuraPoints";
import CustomEventCard from "@/components/events/CustomEventCard";
import { CustomEvent } from "@/types";

export default function LandingPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [feed, setFeed] = useState<LiveFeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeEvents, setActiveEvents] = useState<CustomEvent[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Check auth — but don't redirect, just set state
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsLoggedIn(true);

      // Load public data
      const [matchRes, feedRes, lbRes, eventsRes] = await Promise.all([
        supabase.from("matches").select("*")
          .in("status", ["upcoming", "live"])
          .order("kickoff_time", { ascending: true })
          .limit(12),
        supabase.from("live_feed").select("*").limit(20),
        supabase.from("leaderboard").select("*").limit(10),
        supabase.from("custom_events").select("*, options:custom_event_options(*)").eq("status", "active").order("created_at", { ascending: false }),
      ]);

      if (matchRes.data) setMatches(matchRes.data);
      if (feedRes.data) setFeed(feedRes.data);
      if (lbRes.data) setLeaderboard(lbRes.data);
      if (eventsRes?.data) setActiveEvents(eventsRes.data as CustomEvent[]);
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
          </div>

          <div className="relative stagger z-10">
            <p className="text-faint text-xs mb-3 tracking-widest">
              2026 FIFA WORLD CUP
            </p>
            <h1 className="text-white text-base sm:text-xl mb-4 leading-loose flex items-center justify-center flex-wrap gap-2 text-center w-full uppercase">
              GIVE PREDICTION &amp; TEST YOUR <AuraPoints size={60} className="-translate-y-[3px]" />
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
                <Link href="/auth/signup" className="btn-pixel btn-green w-full sm:w-auto px-8 py-5 text-base sm:text-lg animate-pulse flex items-center justify-center gap-2">
                  CLAIM 100 <AuraPoints size={20} /> FREE
                </Link>
              )}
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex items-center justify-center gap-4 sm:gap-6 flex-wrap opacity-60">
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

        {/* Live feed */}
        <section className="px-5 py-10 max-w-7xl mx-auto w-full ">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="live-dot" />
              <h2 className="text-white text-lg">LIVE PREDICTION FEED</h2>
            </div>
            <LiveFeed items={feed} />
          </div>
        </section>

        <div className="pixel-divider mx-5 " />

        {/* Limited Events Section */}
        {activeEvents.length > 0 && (
          <section className="px-5 py-12 max-w-7xl mx-auto w-full ">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-white text-lg flex items-center gap-2">
                <Zap size={18} className="text-blue-DEFAULT" /> LIMITED EVENTS
              </h2>
            </div>
            
            <div className="flex flex-col gap-6">
               {activeEvents.map(event => (
                 <div key={event.id} className="w-full">
                   <CustomEventCard 
                     event={event} 
                     userVoteId={undefined}
                     onVote={async () => {
                       router.push("/auth/login");
                       return false;
                     }} 
                   />
                 </div>
               ))}
            </div>
          </section>
        )}

        <div className="pixel-divider mx-5" />

        {/* Upcoming Matches Section */}
        <section className="px-5 py-12 max-w-7xl mx-auto w-full ">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-white text-lg">UPCOMING MATCHES</h2>
            <Link href="/hub" className="text-green-DEFAULT text-xs hover:underline flex items-center gap-1">
              WORLD CUP HUB <ArrowRight size={12} className="-mt-[2px]" />
            </Link>
          </div>

          {matches.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-faint text-xs">MATCHES COMING SOON</p>
              <p className="text-faint text-xs mt-3">WORLD CUP KICKS OFF JUNE 2026</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
                {matches.slice(0, showAllMatches ? matches.length : 4).map(match => (
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
              
              {matches.length > 4 && (
                <div className="text-center">
                  <button 
                    onClick={() => setShowAllMatches(!showAllMatches)}
                    className="btn-pixel btn-ghost px-6 py-3 text-xs w-full sm:w-auto mx-auto"
                  >
                    {showAllMatches ? "SHOW LESS" : "SEE MORE MATCHES"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="pixel-divider mx-5 " />

        {/* Leaderboard preview */}
        <section className="px-5 py-10 max-w-7xl mx-auto w-full">
          <div className="max-w-3xl mx-auto">
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
                    className="flex items-center gap-3 sm:gap-4 px-4 py-4 border-b-2 border-border last:border-b-0 hover:bg-surface2 transition-colors"
                  >
                    {/* Rank medal */}
                    <div className={`w-8 sm:w-10 text-center text-sm sm:text-base font-bold flex-shrink-0 ${i === 0 ? "text-yellow-DEFAULT" : i === 1 ? "text-muted" : i === 2 ? "text-pink-DEFAULT" : "text-faint"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface2 border-2 border-border flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg">
                      {entry.avatar_url ? (
                        <Image src={entry.avatar_url} alt="Avatar" width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-green-DEFAULT font-bold text-xs sm:text-sm">
                          {entry.username?.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm sm:text-base font-bold truncate">{entry.username?.toUpperCase()}</p>
                    </div>

                    {/* Balance — enlarged */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <span className="text-green-DEFAULT text-sm sm:text-base font-bold">{formatAura(entry.aura_balance)}</span>
                      <AuraPoints size={20} className="sm:w-6 sm:h-6" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Facebook Community Promo */}
        <section className="px-5 py-12 max-w-7xl mx-auto w-full  mt-10">
          <div className="card p-8 sm:p-12 border-[#0099ff]/50 bg-[#0099ff]/10 flex flex-col md:flex-row items-center justify-between gap-8 animate-slide-up hover:border-[#0099ff]"
            style={{ boxShadow: "0 0 40px rgba(0,153,255,0.1)" }}>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center -ml-2 border-2 border-[#0099ff]/50 bg-[#0099ff]/20">
                  <Users size={32} className="sm:w-10 sm:h-10 text-[#0099ff] drop-shadow-[0_0_10px_rgba(0,153,255,0.6)]" />
                </div>
              </div>
              <p className="text-[#0099ff] text-sm sm:text-base leading-loose mb-3 font-bold" style={{ textShadow: "0 0 10px rgba(0,153,255,0.5)" }}>
                JOIN THE AURA COMMUNITY
              </p>
              <p className="text-faint text-xs leading-relaxed max-w-xl md:mx-0 mx-auto">
                Connect with other predictors in our Facebook group. Discuss match strategies, share your biggest wins, and be part of the Aura Market community!
              </p>
            </div>
            <div className="flex-shrink-0">
              <button onClick={() => window.open('#', '_blank')} className="btn-pixel w-full sm:w-auto px-8 py-4 text-sm flex items-center gap-2 justify-center bg-[#0099ff]/20 text-[#0099ff] border-2 border-[#0099ff] hover:bg-[#0099ff] hover:text-white transition-colors">
                JOIN FACEBOOK GROUP <ExternalLink size={16} className="-mt-[2px]" />
              </button>
            </div>
          </div>
        </section>

        <div className="pixel-divider mx-5  hidden sm:block" />

        {/* CTA Section */}
        <section className="px-5 py-16 pb-28 md:pb-16 text-center order-7 lg:order-none">
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
                  100 <AuraPoints size={18} /> FREE
                </span>
              </Link>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-faint text-xs border-t-2 border-border mt-auto flex items-center justify-center bg-bg2">
        <p>CREATED BY <span className="text-white hover:text-green-DEFAULT transition-colors cursor-pointer">GROWIX STUDIO</span></p>
      </footer>
    </div >
  );
}
