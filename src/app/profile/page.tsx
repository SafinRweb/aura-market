"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Bet, Match } from "@/types";
import AppLayout from "@/components/layout/AppLayout";
import { formatAura, winRate, timeAgo, marketLabel } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    TrendingUp, TrendingDown, Target, Zap,
    Trophy, Flame, Star, Crown, Upload, LogOut
} from "lucide-react";
import { MarketType } from "@/types";

interface BetWithMatch extends Bet {
    match: Match;
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [bets, setBets] = useState<BetWithMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "pending" | "won" | "lost">("all");

    useEffect(() => {
        async function load() {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { router.push("/auth/login"); return; }

            const [userRes, betsRes] = await Promise.all([
                supabase.from("users").select("*").eq("id", authUser.id).single(),
                supabase.from("bets").select("*, match:matches(*)").eq("user_id", authUser.id)
                    .order("created_at", { ascending: false }).limit(50),
            ]);

            setUser(userRes.data);
            setBets((betsRes.data as BetWithMatch[]) || []);
            setLoading(false);
        }
        load();
    }, [router]);

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        if (file.size > 2 * 1024 * 1024) { alert("Max 2MB"); return; }

        setUploading(true);
        const ext = file.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;

        await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("users").update({ avatar_url: data.publicUrl }).eq("id", user.id);
        setUser(prev => prev ? { ...prev, avatar_url: data.publicUrl } : prev);
        setUploading(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/");
    }

    const filteredBets = bets.filter(b => activeTab === "all" ? true : b.status === activeTab);

    const stats = [
        { label: "BALANCE", value: formatAura(user?.aura_balance || 0), icon: <Star size={12} />, color: "text-green-DEFAULT", bg: "bg-green-dim border-green-DEFAULT" },
        { label: "GAINED", value: formatAura(user?.total_gained || 0), icon: <TrendingUp size={12} />, color: "text-green-DEFAULT", bg: "bg-green-dim border-green-DEFAULT" },
        { label: "LOST", value: formatAura(user?.total_lost || 0), icon: <TrendingDown size={12} />, color: "text-pink-DEFAULT", bg: "bg-pink-dim border-pink-DEFAULT" },
        { label: "WIN RATE", value: winRate(user?.win_count || 0, user?.total_bets || 0), icon: <Target size={12} />, color: "text-yellow-DEFAULT", bg: "bg-yellow-dim border-yellow-DEFAULT" },
        { label: "STREAK", value: `🔥 ${user?.streak || 0}D`, icon: <Flame size={12} />, color: "text-pink-DEFAULT", bg: "bg-pink-dim border-pink-DEFAULT" },
        { label: "TOTAL PREDICTIONS", value: String(user?.total_bets || 0), icon: <Zap size={12} />, color: "text-blue-DEFAULT", bg: "bg-blue-dim border-blue-DEFAULT" },
        { label: "BEST WIN", value: formatAura(user?.biggest_win || 0), icon: <Trophy size={12} />, color: "text-yellow-DEFAULT", bg: "bg-yellow-dim border-yellow-DEFAULT" },
        { label: "RANK", value: user?.leaderboard_rank ? `#${user.leaderboard_rank}` : "—", icon: <Crown size={12} />, color: "text-yellow-DEFAULT", bg: "bg-yellow-dim border-yellow-DEFAULT" },
    ];

    if (loading) return (
        <AppLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="neon-green text-sm animate-pulse">LOADING PROFILE...</p>
            </div>
        </AppLayout>
    );

    return (
        <AppLayout>
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4">

                {/* ── Profile Card ── */}
                <div className="card p-4 sm:p-6 mb-4 animate-slide-up">
                    {/* Top row: avatar + info + logout */}
                    <div className="flex items-start gap-4">

                        {/* Avatar with upload overlay */}
                        <div className="relative group shrink-0">
                            <div
                                className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-green-DEFAULT overflow-hidden"
                                style={{ boxShadow: "0 0 20px rgba(0,255,135,0.25)" }}
                            >
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-surface2 flex items-center justify-center">
                                        <span className="neon-green text-xl sm:text-2xl">
                                            {user?.username?.slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {/* Upload trigger */}
                            <label className="absolute inset-0 flex items-center justify-center bg-bg opacity-0 group-hover:opacity-90 cursor-pointer transition-opacity border-2 border-green-DEFAULT touch-manipulation">
                                <div className="text-center">
                                    <Upload size={12} className="text-green-DEFAULT mx-auto mb-1" />
                                    <p className="text-green-DEFAULT" style={{ fontSize: "7px" }}>
                                        {uploading ? "..." : "CHANGE"}
                                    </p>
                                </div>
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                            </label>
                        </div>

                        {/* Username + meta */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="min-w-0">
                                    <h1 className="neon-green text-base sm:text-xl truncate">
                                        {user?.username?.toUpperCase()}
                                    </h1>
                                </div>

                                {/* Logout button — always visible */}
                                <button
                                    onClick={handleLogout}
                                    className="btn-pixel btn-ghost flex items-center gap-1.5 px-2 py-2 text-xs text-pink-DEFAULT border-pink-DEFAULT shrink-0"
                                    style={{ boxShadow: "none" }}
                                >
                                    <LogOut size={11} />
                                    <span className="hidden sm:inline">LOGOUT</span>
                                </button>
                            </div>

                            <p className="text-faint text-xs mb-2">
                                SINCE {new Date(user?.created_at || "").toLocaleDateString("en-US", {
                                    month: "short", year: "numeric"
                                }).toUpperCase()}
                            </p>

                            {/* Win / loss row */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-white text-xs">
                                    {user?.win_count || 0}
                                    <span className="text-faint ml-1" style={{ fontSize: "8px" }}>W</span>
                                </span>
                                <span className="text-faint text-xs">·</span>
                                <span className="text-white text-xs">
                                    {user?.loss_count || 0}
                                    <span className="text-faint ml-1" style={{ fontSize: "8px" }}>L</span>
                                </span>
                                <span className="text-faint text-xs">·</span>
                                <span className="text-green-DEFAULT text-xs">
                                    {winRate(user?.win_count || 0, user?.total_bets || 0)}
                                    <span className="text-faint ml-1" style={{ fontSize: "8px" }}>WR</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Balance highlight strip */}
                    <div className="mt-4 pt-4 border-t-2 border-border flex items-center justify-between">
                        <p className="text-faint text-xs">CURRENT BALANCE</p>
                        <p className="neon-green text-xl">{formatAura(user?.aura_balance || 0)}</p>
                    </div>
                </div>

                {/* ── Stats grid ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 stagger">
                    {stats.map(stat => (
                        <div key={stat.label} className={`card p-3 border-2 ${stat.bg}`}>
                            <div className={`flex items-center gap-1.5 mb-2 ${stat.color}`}>
                                {stat.icon}
                                <p className="text-faint" style={{ fontSize: "7px" }}>{stat.label}</p>
                            </div>
                            <p className={`${stat.color} text-xs leading-normal`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Bet history ── */}
                <div className="card overflow-hidden">
                    {/* Header + filter tabs */}
                    <div className="p-3 sm:p-4 border-b-2 border-border bg-surface2">
                        <h2 className="text-white text-xs mb-3">PREDICTION HISTORY</h2>
                        {/* Horizontally scrollable tabs */}
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-0.5 px-0.5">
                            {(["all", "pending", "won", "lost"] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-2 text-xs border-2 transition-all whitespace-nowrap shrink-0 touch-manipulation
                                        ${activeTab === tab
                                            ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                            : "border-border text-faint hover:border-border2"
                                        }`}
                                >
                                    {tab.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredBets.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-faint text-xs">NO PREDICTIONS YET</p>
                            <p className="text-faint mt-2" style={{ fontSize: "8px" }}>START PREDICTING TO SEE YOUR HISTORY</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {filteredBets.map(bet => (
                                <div
                                    key={bet.id}
                                    className="p-3 sm:p-4 hover:bg-surface2 transition-colors"
                                >
                                    {/* Match teams */}
                                    <p className="text-faint text-xs mb-2 truncate">
                                        {bet.match?.home_team} VS {bet.match?.away_team}
                                    </p>

                                    {/* Market + outcome + status row */}
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                            <span className="badge text-blue-DEFAULT border-blue-DEFAULT bg-blue-dim shrink-0">
                                                {marketLabel(bet.market_type as MarketType)}
                                            </span>
                                            <span className="text-white text-xs truncate">
                                                {bet.outcome.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className={`badge shrink-0 ${
                                            bet.status === "won"
                                                ? "text-green-DEFAULT border-green-DEFAULT bg-green-dim"
                                                : bet.status === "lost"
                                                    ? "text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim"
                                                    : bet.status === "void"
                                                        ? "text-faint border-border bg-surface"
                                                        : "text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim"
                                        }`}>
                                            {bet.status.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Stake + payout + time row */}
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-faint text-xs">{timeAgo(bet.created_at)}</p>
                                        <div className="text-right">
                                            <span className="text-white text-xs">{formatAura(bet.stake)}</span>
                                            {bet.status === "won" && bet.actual_payout && (
                                                <span className="text-green-DEFAULT ml-2 text-xs">+{formatAura(bet.actual_payout)}</span>
                                            )}
                                            {bet.status === "pending" && (
                                                <span className="text-faint ml-2" style={{ fontSize: "8px" }}>EST +{formatAura(bet.potential_payout)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </AppLayout>
    );
}