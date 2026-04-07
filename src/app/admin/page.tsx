"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatAura } from "@/lib/utils";
import {
    Users, Zap, TrendingUp,
    Activity, RefreshCw
} from "lucide-react";

interface Stats {
    totalUsers: number;
    totalBets: number;
    totalAura: number;
    activeBets: number;
    liveMatches: number;
    upcomingMatches: number;
    todayBets: number;
    todayNewUsers: number;
}

interface RecentBet {
    id: string;
    username: string;
    match_home: string;
    match_away: string;
    market_type: string;
    outcome: string;
    stake: number;
    status: string;
    created_at: string;
}

interface TopMatch {
    match_id: string;
    home: string;
    away: string;
    count: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentBets, setRecentBets] = useState<RecentBet[]>([]);
    const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();

        // Realtime updates
        const channel = supabase
            .channel("admin-dashboard")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "bets",
            }, () => loadStats())
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "users",
            }, () => loadStats())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    async function loadStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            usersRes,
            betsRes,
            activeBetsRes,
            liveRes,
            upcomingRes,
            todayBetsRes,
            todayUsersRes,
            recentBetsRes,
            topMatchesRes,
        ] = await Promise.all([
            supabase.from("users").select("aura_balance", { count: "exact" }),
            supabase.from("bets").select("*", { count: "exact", head: true }),
            supabase.from("bets").select("*", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("matches").select("*", { count: "exact", head: true }).eq("status", "live"),
            supabase.from("matches").select("*", { count: "exact", head: true }).eq("status", "upcoming"),
            supabase.from("bets").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
            supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
            supabase.from("live_feed").select("*").limit(10),
            supabase.from("bets")
                .select("match_id, matches(home_team, away_team)")
                .eq("status", "pending")
                .limit(100),
        ]);

        // Calculate total aura
        const totalAura = usersRes.data?.reduce((sum, u) => sum + (u.aura_balance || 0), 0) || 0;

        setStats({
            totalUsers: usersRes.count || 0,
            totalBets: betsRes.count || 0,
            activeBets: activeBetsRes.count || 0,
            totalAura,
            liveMatches: liveRes.count || 0,
            upcomingMatches: upcomingRes.count || 0,
            todayBets: todayBetsRes.count || 0,
            todayNewUsers: todayUsersRes.count || 0,
        });

        setRecentBets(recentBetsRes.data || []);

        // Count bets per match
        const matchCounts: Record<string, TopMatch> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        topMatchesRes.data?.forEach((bet: any) => {
            const id = bet.match_id;
            if (!matchCounts[id]) {
                matchCounts[id] = {
                    match_id: id,
                    home: bet.matches?.home_team,
                    away: bet.matches?.away_team,
                    count: 0,
                };
            }
            matchCounts[id].count++;
        });

        setTopMatches(
            Object.values(matchCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
        );

        setLoading(false);
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="neon-green text-sm animate-pulse">LOADING...</p>
        </div>
    );

    const statCards = [
        { label: "TOTAL USERS", value: stats?.totalUsers || 0, icon: <Users size={14} />, color: "text-blue-DEFAULT", border: "border-blue-DEFAULT bg-blue-dim" },
        { label: "TOTAL BETS", value: stats?.totalBets || 0, icon: <Zap size={14} />, color: "text-yellow-DEFAULT", border: "border-yellow-DEFAULT bg-yellow-dim" },
        { label: "ACTIVE BETS", value: stats?.activeBets || 0, icon: <Activity size={14} />, color: "text-green-DEFAULT", border: "border-green-DEFAULT bg-green-dim" },
        { label: "AURA IN CIRCULATION", value: formatAura(stats?.totalAura || 0), icon: <TrendingUp size={14} />, color: "text-pink-DEFAULT", border: "border-pink-DEFAULT bg-pink-dim" },
        { label: "LIVE MATCHES", value: stats?.liveMatches || 0, icon: <Activity size={14} />, color: "text-pink-DEFAULT", border: "border-pink-DEFAULT bg-pink-dim" },
        { label: "UPCOMING MATCHES", value: stats?.upcomingMatches || 0, icon: <Activity size={14} />, color: "text-yellow-DEFAULT", border: "border-yellow-DEFAULT bg-yellow-dim" },
        { label: "BETS TODAY", value: stats?.todayBets || 0, icon: <Zap size={14} />, color: "text-green-DEFAULT", border: "border-green-DEFAULT bg-green-dim" },
        { label: "NEW USERS TODAY", value: stats?.todayNewUsers || 0, icon: <Users size={14} />, color: "text-blue-DEFAULT", border: "border-blue-DEFAULT bg-blue-dim" },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="neon-green text-xl mb-1">DASHBOARD</h1>
                    <p className="text-faint text-xs">REAL-TIME PLATFORM OVERVIEW</p>
                </div>
                <button
                    onClick={loadStats}
                    className="btn-pixel btn-ghost flex items-center gap-2 text-xs px-3 py-2"
                >
                    <RefreshCw size={11} />
                    REFRESH
                </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {statCards.map(stat => (
                    <div key={stat.label} className={`card p-4 border-2 ${stat.border}`}>
                        <div className={`flex items-center gap-2 mb-2 ${stat.color}`}>
                            {stat.icon}
                            <p className="text-faint text-xs">{stat.label}</p>
                        </div>
                        <p className={`${stat.color} text-lg`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Recent bets */}
                <div className="card overflow-hidden">
                    <div className="p-4 border-b-2 border-border bg-surface2">
                        <h2 className="text-white text-sm">RECENT BETS</h2>
                    </div>
                    <div className="divide-y-2 divide-border">
                        {recentBets.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-faint text-xs">NO BETS YET</p>
                            </div>
                        ) : (
                            recentBets.map((bet, i) => (
                                <div key={i} className="p-3 hover:bg-surface2 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-green-DEFAULT text-xs">{bet.username}</span>
                                        <span className="text-white text-xs">{formatAura(bet.stake)}</span>
                                    </div>
                                    <p className="text-faint text-xs">
                                        {bet.match_home} vs {bet.match_away} · {bet.outcome.toUpperCase()}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Top matches by bets */}
                <div className="card overflow-hidden">
                    <div className="p-4 border-b-2 border-border bg-surface2">
                        <h2 className="text-white text-sm">MOST BET MATCHES</h2>
                    </div>
                    <div className="divide-y-2 divide-border">
                        {topMatches.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-faint text-xs">NO DATA YET</p>
                            </div>
                        ) : (
                            topMatches.map((m, i) => (
                                <div key={i} className="p-3 flex items-center justify-between hover:bg-surface2">
                                    <p className="text-white text-xs">
                                        {m.home} vs {m.away}
                                    </p>
                                    <span className="badge text-green-DEFAULT border-green-DEFAULT bg-green-dim">
                                        {m.count} BETS
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}