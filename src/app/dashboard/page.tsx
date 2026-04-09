"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Match, LiveFeedItem } from "@/types";
import AppLayout from "@/components/layout/AppLayout";
import MatchCard from "@/components/match/MatchCard";
import LiveFeed from "@/components/feed/LiveFeed";
import DailyStreakModal from "@/components/ui/DailyStreakModal";
import WelcomeModal from "@/components/ui/WelcomeModal";
import { winRate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Zap, Users } from "lucide-react";
import { AuraAmount } from "@/components/ui/AuraPoints";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [feedItems, setFeedItems] = useState<LiveFeedItem[]>([]);
  const [showStreak, setShowStreak] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/auth/login"); return; }

      // Load user profile
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!profile) { router.push("/auth/login"); return; }

      // Redirect to setup if no proper username
      if (profile.username?.startsWith("user_")) {
        router.push("/auth/setup"); return;
      }

      setUser(profile);

      // Check daily streak / welcome
      const { data: streak } = await supabase
        .from("daily_streaks")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (!streak) {
        // Brand new user — show welcome modal
        setShowWelcome(true);
      } else {
        const today = new Date().toISOString().split("T")[0];
        if (streak.last_claimed !== today) {
          setCurrentStreak(streak.current_streak || 0);
          setShowStreak(true);
        }
      }

      // Load upcoming matches
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .in("status", ["upcoming", "live"])
        .order("kickoff_time", { ascending: true })
        .limit(12);

      setMatches(matchData || []);

      // Load live feed
      const { data: feed } = await supabase
        .from("live_feed")
        .select("*")
        .limit(30);

      setFeedItems(feed || []);
      setLoading(false);
    }
    load();

    // Realtime feed subscription
    const channel = supabase
      .channel("dashboard-feed")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bets",
      }, async () => {
        const { data } = await supabase
          .from("live_feed")
          .select("*")
          .limit(30);
        setFeedItems(data || []);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-green-DEFAULT text-sm animate-pulse">LOADING MARKET...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {showWelcome && user && (
        <WelcomeModal
          userId={user.id}
          onClaimed={() => {
            setShowWelcome(false);
            setUser(prev => prev ? { ...prev, aura_balance: 100 } : prev);
          }}
        />
      )}
      {showStreak && !showWelcome && user && (
        <DailyStreakModal
          userId={user.id}
          currentStreak={currentStreak}
          onClose={() => setShowStreak(false)}
          onClaim={(amount) => setUser(prev => prev ? {
            ...prev,
            aura_balance: prev.aura_balance + amount
          } : prev)}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          <div className="card p-3 sm:p-4">
            <p className="text-faint text-xs mb-1 sm:mb-2">BALANCE</p>
            <p className="text-green-DEFAULT text-base sm:text-lg"><AuraAmount amount={user?.aura_balance || 0} size={22} /></p>
          </div>
          <div className="card p-3 sm:p-4">
            <p className="text-faint text-xs mb-1 sm:mb-2">WIN RATE</p>
            <p className="text-yellow-DEFAULT text-base sm:text-lg">
              {winRate(user?.win_count || 0, user?.total_bets || 0)}
            </p>
          </div>
          <div className="card p-3 sm:p-4">
            <p className="text-faint text-xs mb-1 sm:mb-2">TOTAL PREDICTIONS</p>
            <p className="text-blue-DEFAULT text-base sm:text-lg">{user?.total_bets || 0}</p>
          </div>
          <div className="card p-3 sm:p-4">
            <p className="text-faint text-xs mb-1 sm:mb-2">STREAK</p>
            <p className="text-pink-DEFAULT text-base sm:text-lg">🔥 {user?.streak || 0}</p>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">

          {/* Matches - full width on mobile */}
          <div className="order-2 lg:order-1 lg:col-span-2">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <Zap size={14} className="text-yellow-DEFAULT" />
              <h2 className="text-xs sm:text-sm text-white">UPCOMING MATCHES</h2>
            </div>

            {matches.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-faint text-xs">NO MATCHES AVAILABLE YET</p>
                <p className="text-faint text-xs mt-2">CHECK BACK SOON</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>

          {/* Live Feed - below matches on mobile, sidebar on desktop */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="live-dot" />
              <h2 className="text-xs sm:text-sm text-white">LIVE FEED</h2>
              <span className="text-faint text-xs ml-auto">
                <Users size={10} className="inline mr-1" />
                GLOBAL
              </span>
            </div>
            <LiveFeed items={feedItems} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}