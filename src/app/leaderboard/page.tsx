"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeaderboardEntry } from "@/types";
import Navbar from "@/components/layout/Navbar";
import { formatAura, winRate, rankBadge } from "@/lib/utils";
import { Crown, Zap } from "lucide-react";

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"all" | "top10">("all");

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();

            const { data } = await supabase
                .from("leaderboard")
                .select("*")
                .limit(100);

            setEntries(data || []);

            if (user) {
                const myEntry = data?.find(e => e.user_id === user.id);
                if (myEntry) setMyRank(myEntry);
            }

            setLoading(false);
        }
        load();

        // Realtime leaderboard updates
        const channel = supabase
            .channel("leaderboard")
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "users",
            }, async () => {
                const { data } = await supabase
                    .from("leaderboard")
                    .select("*")
                    .limit(100);
                setEntries(data || []);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const displayed = tab === "top10" ? entries.slice(0, 10) : entries;

    const podium = entries.slice(0, 3);

    if (loading) return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <p className="neon-green text-sm animate-pulse">LOADING RANKS...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-bg crt">
            <Navbar />
            <main className="pt-16 max-w-4xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="text-center my-10 animate-slide-up">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <Crown size={20} className="text-yellow-DEFAULT" />
                        <h1 className="neon-green text-2xl">HALL OF FAME</h1>
                        <Crown size={20} className="text-yellow-DEFAULT" />
                    </div>
                    <p className="text-faint text-xs">
                        GLOBAL RANKINGS · {entries.length} PLAYERS
                    </p>
                </div>

                {/* Top 3 Podium */}
                {podium.length >= 3 && (
                    <div className="mb-10 animate-slide-up">
                        <div className="flex items-end justify-center gap-4">

                            {/* 2nd place */}
                            <div className="flex flex-col items-center gap-3 flex-1 max-w-48">
                                <div className="w-16 h-16 border-2 border-muted overflow-hidden"
                                    style={{ boxShadow: "0 0 15px rgba(170,170,204,0.3)" }}>
                                    {podium[1]?.avatar_url ? (
                                        <img src={podium[1].avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-surface2 flex items-center justify-center">
                                            <span className="text-muted text-lg">
                                                {podium[1]?.username?.slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-muted text-xs text-center truncate w-full">
                                    {podium[1]?.username?.toUpperCase()}
                                </p>
                                <p className="text-muted text-xs">{formatAura(podium[1]?.aura_balance)}</p>
                                <div className="w-full bg-surface border-2 border-muted p-3 text-center"
                                    style={{ height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <div>
                                        <p className="text-3xl mb-1">⚡</p>
                                        <p className="text-muted text-xs">#2</p>
                                    </div>
                                </div>
                            </div>

                            {/* 1st place */}
                            <div className="flex flex-col items-center gap-3 flex-1 max-w-48">
                                <div className="text-2xl animate-float">👑</div>
                                <div className="w-20 h-20 border-2 border-yellow-DEFAULT overflow-hidden"
                                    style={{ boxShadow: "0 0 25px rgba(255,190,11,0.4)" }}>
                                    {podium[0]?.avatar_url ? (
                                        <img src={podium[0].avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-surface2 flex items-center justify-center">
                                            <span className="text-yellow-DEFAULT text-xl">
                                                {podium[0]?.username?.slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-yellow-DEFAULT text-sm text-center truncate w-full">
                                    {podium[0]?.username?.toUpperCase()}
                                </p>
                                <p className="text-yellow-DEFAULT text-sm">{formatAura(podium[0]?.aura_balance)}</p>
                                <div className="w-full bg-yellow-dim border-2 border-yellow-DEFAULT p-3 text-center"
                                    style={{
                                        height: "120px", display: "flex", alignItems: "center", justifyContent: "center",
                                        boxShadow: "0 0 20px rgba(255,190,11,0.2)"
                                    }}>
                                    <div>
                                        <p className="text-yellow-DEFAULT text-xs mb-1">AURA GOD</p>
                                        <p className="text-4xl">#1</p>
                                    </div>
                                </div>
                            </div>

                            {/* 3rd place */}
                            <div className="flex flex-col items-center gap-3 flex-1 max-w-48">
                                <div className="w-16 h-16 border-2 border-border2 overflow-hidden"
                                    style={{ boxShadow: "0 0 15px rgba(255,190,11,0.15)" }}>
                                    {podium[2]?.avatar_url ? (
                                        <img src={podium[2].avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-surface2 flex items-center justify-center">
                                            <span className="text-faint text-lg">
                                                {podium[2]?.username?.slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-faint text-xs text-center truncate w-full">
                                    {podium[2]?.username?.toUpperCase()}
                                </p>
                                <p className="text-faint text-xs">{formatAura(podium[2]?.aura_balance)}</p>
                                <div className="w-full bg-surface border-2 border-border2 p-3 text-center"
                                    style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <div>
                                        <p className="text-2xl mb-1">🔥</p>
                                        <p className="text-faint text-xs">#3</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* My rank banner */}
                {myRank && (
                    <div className="bg-green-dim border-2 border-green-DEFAULT p-4 mb-6 flex items-center justify-between animate-slide-up"
                        style={{ boxShadow: "0 0 20px rgba(0,255,135,0.15)" }}>
                        <div className="flex items-center gap-3">
                            <span className="neon-green text-sm">YOUR RANK</span>
                            <span className="text-white text-sm">#{myRank.rank}</span>
                            {rankBadge(Number(myRank.rank)) && (
                                <span className="text-yellow-DEFAULT text-xs">
                                    {rankBadge(Number(myRank.rank))}
                                </span>
                            )}
                        </div>
                        <span className="text-green-DEFAULT text-sm">
                            {formatAura(myRank.aura_balance)}
                        </span>
                    </div>
                )}

                {/* Tab toggle */}
                <div className="flex gap-2 mb-6">
                    {(["all", "top10"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 text-xs border-2 transition-all
                ${tab === t
                                    ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                    : "border-border text-faint hover:border-border2"
                                }`}
                        >
                            {t === "all" ? "ALL PLAYERS" : "TOP 10"}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-2 text-faint text-xs">
                        <Zap size={11} />
                        LIVE UPDATES
                    </div>
                </div>

                {/* Leaderboard table */}
                <div className="card overflow-hidden animate-slide-up">

                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 p-3 border-b-2 border-border bg-surface2 text-faint text-xs">
                        <div className="col-span-1 text-center">RANK</div>
                        <div className="col-span-5">PLAYER</div>
                        <div className="col-span-2 text-right">BALANCE</div>
                        <div className="col-span-2 text-right hidden md:block">WIN RATE</div>
                        <div className="col-span-2 text-right hidden md:block">BETS</div>
                    </div>

                    {displayed.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-faint text-sm">NO PLAYERS YET</p>
                            <p className="text-faint text-xs mt-2">BE THE FIRST TO JOIN</p>
                        </div>
                    ) : (
                        displayed.map((entry, i) => {
                            const isMe = entry.user_id === myRank?.user_id;
                            const rank = Number(entry.rank);

                            return (
                                <div
                                    key={entry.user_id}
                                    className={`grid grid-cols-12 gap-2 p-3 border-b-2 border-border items-center transition-colors
                    ${isMe ? "bg-green-dim border-l-4 border-l-green-DEFAULT" : "hover:bg-surface2"}
                    ${i === 0 ? "bg-yellow-dim hover:bg-yellow-dim" : ""}
                  `}
                                >
                                    {/* Rank */}
                                    <div className="col-span-1 text-center">
                                        {rank === 1 ? (
                                            <span className="text-xl">👑</span>
                                        ) : rank === 2 ? (
                                            <span className="text-xl">⚡</span>
                                        ) : rank === 3 ? (
                                            <span className="text-xl">🔥</span>
                                        ) : (
                                            <span className={`text-sm ${isMe ? "text-green-DEFAULT" : "text-faint"}`}>
                                                #{rank}
                                            </span>
                                        )}
                                    </div>

                                    {/* Player */}
                                    <div className="col-span-5 flex items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-border flex-shrink-0 overflow-hidden"
                                            style={rank <= 3 ? { borderColor: rank === 1 ? "#ffbe0b" : rank === 2 ? "#aaaacc" : "#666688" } : {}}>
                                            {entry.avatar_url ? (
                                                <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-surface2 flex items-center justify-center">
                                                    <span className={`text-xs ${rank === 1 ? "text-yellow-DEFAULT" : "text-faint"}`}>
                                                        {entry.username?.slice(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm truncate ${isMe ? "text-green-DEFAULT" : rank === 1 ? "text-yellow-DEFAULT" : "text-white"}`}>
                                                {entry.username?.toUpperCase()}
                                                {isMe && <span className="text-faint text-xs ml-2">(YOU)</span>}
                                            </p>
                                            {rankBadge(rank) && (
                                                <p className="text-yellow-DEFAULT text-xs mt-0.5">{rankBadge(rank)}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Balance */}
                                    <div className="col-span-2 text-right">
                                        <p className={`text-sm ${rank === 1 ? "text-yellow-DEFAULT" : isMe ? "text-green-DEFAULT" : "text-white"}`}>
                                            {formatAura(entry.aura_balance)}
                                        </p>
                                    </div>

                                    {/* Win rate */}
                                    <div className="col-span-2 text-right hidden md:block">
                                        <p className="text-sm text-muted">
                                            {winRate(entry.win_count, entry.total_bets)}
                                        </p>
                                    </div>

                                    {/* Total bets */}
                                    <div className="col-span-2 text-right hidden md:block">
                                        <p className="text-sm text-faint">{entry.total_bets}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer note */}
                <p className="text-center text-faint text-xs mt-6">
                    RANKINGS UPDATE IN REAL TIME · TOP 100 SHOWN
                </p>
            </main>
        </div>
    );
}