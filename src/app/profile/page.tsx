"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Bet, Match } from "@/types";
import AppLayout from "@/components/layout/AppLayout";
import { formatAura, winRate, timeAgo, marketLabel } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    TrendingUp, TrendingDown, Target, Zap,
    Trophy, Flame, Star, Crown, Upload
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

    const filteredBets = bets.filter(b => activeTab === "all" ? true : b.status === activeTab);

    const stats = [
        {
            label: "AURA BALANCE",
            value: formatAura(user?.aura_balance || 0),
            icon: <Star size={14} />,
            color: "text-green-DEFAULT",
            bg: "bg-green-dim border-green-DEFAULT",
        },
        {
            label: "TOTAL GAINED",
            value: formatAura(user?.total_gained || 0),
            icon: <TrendingUp size={14} />,
            color: "text-green-DEFAULT",
            bg: "bg-green-dim border-green-DEFAULT",
        },
        {
            label: "TOTAL LOST",
            value: formatAura(user?.total_lost || 0),
            icon: <TrendingDown size={14} />,
            color: "text-pink-DEFAULT",
            bg: "bg-pink-dim border-pink-DEFAULT",
        },
        {
            label: "WIN / LOSS RATIO",
            value: winRate(user?.win_count || 0, user?.total_bets || 0),
            icon: <Target size={14} />,
            color: "text-yellow-DEFAULT",
            bg: "bg-yellow-dim border-yellow-DEFAULT",
        },
        {
            label: "LOGIN STREAK",
            value: `🔥 ${user?.streak || 0} DAYS`,
            icon: <Flame size={14} />,
            color: "text-pink-DEFAULT",
            bg: "bg-pink-dim border-pink-DEFAULT",
        },
        {
            label: "TOTAL BETS",
            value: String(user?.total_bets || 0),
            icon: <Zap size={14} />,
            color: "text-blue-DEFAULT",
            bg: "bg-blue-dim border-blue-DEFAULT",
        },
        {
            label: "BIGGEST WIN",
            value: formatAura(user?.biggest_win || 0),
            icon: <Trophy size={14} />,
            color: "text-yellow-DEFAULT",
            bg: "bg-yellow-dim border-yellow-DEFAULT",
        },
        {
            label: "LEADERBOARD RANK",
            value: user?.leaderboard_rank ? `#${user.leaderboard_rank}` : "UNRANKED",
            icon: <Crown size={14} />,
            color: "text-yellow-DEFAULT",
            bg: "bg-yellow-dim border-yellow-DEFAULT",
        },
    ];

    if (loading) return (
        <AppLayout>
            <div className="flex items-center justify-center min-h-screen">
                <p className="neon-green text-sm animate-pulse">LOADING PROFILE...</p>
            </div>
        </AppLayout>
    );

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto px-4 py-8">

                {/* Profile header */}
                <div className="card p-6 mb-8 animate-slide-up">
                    <div className="flex items-center gap-6">

                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-20 h-20 border-2 border-green-DEFAULT overflow-hidden"
                                style={{ boxShadow: "0 0 20px rgba(0,255,135,0.3)" }}>
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-surface2 flex items-center justify-center">
                                        <span className="neon-green text-2xl">
                                            {user?.username?.slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {/* Upload overlay */}
                            <label className="absolute inset-0 flex items-center justify-center bg-bg opacity-0 group-hover:opacity-90 cursor-pointer transition-opacity border-2 border-green-DEFAULT">
                                <div className="text-center">
                                    <Upload size={14} className="text-green-DEFAULT mx-auto mb-1" />
                                    <p className="text-green-DEFAULT text-xs">
                                        {uploading ? "..." : "CHANGE"}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* User info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="neon-green text-xl">
                                    {user?.username?.toUpperCase()}
                                </h1>
                                {user?.leaderboard_rank === 1 && (
                                    <span className="badge text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim">
                                        AURA LORD
                                    </span>
                                )}
                                {user?.leaderboard_rank === 2 && (
                                    <span className="badge text-muted border-muted bg-surface">
                                        MOGGER
                                    </span>
                                )}
                                {user?.leaderboard_rank === 3 && (
                                    <span className="badge text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim">
                                        PATLA AURA
                                    </span>
                                )}
                            </div>
                            <p className="text-faint text-xs mb-3">
                                MEMBER SINCE {new Date(user?.created_at || "").toLocaleDateString("en-US", {
                                    month: "long", year: "numeric"
                                }).toUpperCase()}
                            </p>
                            <div className="flex items-center gap-4">
                                <span className="text-white text-sm">
                                    {user?.win_count || 0}
                                    <span className="text-faint text-xs ml-1">WINS</span>
                                </span>
                                <span className="text-faint">·</span>
                                <span className="text-white text-sm">
                                    {user?.loss_count || 0}
                                    <span className="text-faint text-xs ml-1">LOSSES</span>
                                </span>
                                <span className="text-faint">·</span>
                                <span className="text-green-DEFAULT text-sm">
                                    {winRate(user?.win_count || 0, user?.total_bets || 0)}
                                    <span className="text-faint text-xs ml-1">WIN RATE</span>
                                </span>
                            </div>
                        </div>

                        {/* Balance highlight */}
                        <div className="hidden md:block text-right">
                            <p className="text-faint text-xs mb-1">CURRENT BALANCE</p>
                            <p className="neon-green text-2xl">{formatAura(user?.aura_balance || 0)}</p>
                        </div>
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 stagger">
                    {stats.map(stat => (
                        <div key={stat.label} className={`card p-4 border-2 ${stat.bg}`}>
                            <div className={`flex items-center gap-2 mb-2 ${stat.color}`}>
                                {stat.icon}
                                <p className="text-faint text-xs">{stat.label}</p>
                            </div>
                            <p className={`${stat.color} text-sm`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Bet history */}
                <div className="card overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b-2 border-border bg-surface2">
                        <h2 className="text-white text-sm">BET HISTORY</h2>
                        <div className="flex gap-1">
                            {(["all", "pending", "won", "lost"] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1 text-xs border-2 transition-all
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
                        <div className="p-12 text-center">
                            <p className="text-faint text-sm">NO BETS YET</p>
                            <p className="text-faint text-xs mt-2">START BETTING TO SEE YOUR HISTORY</p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-border">
                            {filteredBets.map(bet => (
                                <div key={bet.id}
                                    className="p-4 hover:bg-surface2 transition-colors animate-fade-in">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Match */}
                                            <p className="text-faint text-xs mb-1">
                                                {bet.match?.home_team} VS {bet.match?.away_team}
                                            </p>
                                            {/* Market + Outcome */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="badge text-blue-DEFAULT border-blue-DEFAULT bg-blue-dim">
                                                    {marketLabel(bet.market_type as MarketType)}
                                                </span>
                                                <span className="text-white text-sm">
                                                    {bet.outcome.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-faint text-xs">{timeAgo(bet.created_at)}</p>
                                        </div>

                                        <div className="text-right flex-shrink-0">
                                            {/* Status */}
                                            <span className={`badge mb-2 block ${bet.status === "won"
                                                ? "text-green-DEFAULT border-green-DEFAULT bg-green-dim"
                                                : bet.status === "lost"
                                                    ? "text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim"
                                                    : bet.status === "void"
                                                        ? "text-faint border-border bg-surface"
                                                        : "text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim"
                                                }`}>
                                                {bet.status.toUpperCase()}
                                            </span>
                                            {/* Stake */}
                                            <p className="text-white text-sm">{formatAura(bet.stake)}</p>
                                            {/* Payout */}
                                            {bet.status === "won" && bet.actual_payout && (
                                                <p className="text-green-DEFAULT text-xs mt-1">
                                                    +{formatAura(bet.actual_payout)}
                                                </p>
                                            )}
                                            {bet.status === "pending" && (
                                                <p className="text-faint text-xs mt-1">
                                                    EST: {formatAura(bet.potential_payout)}
                                                </p>
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