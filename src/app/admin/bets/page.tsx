"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatAura, timeAgo, marketLabel } from "@/lib/utils";
import { MarketType } from "@/types";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface BetRow {
    id: string;
    user_id: string;
    match_id: string;
    market_type: string;
    outcome: string;
    stake: number;
    potential_payout: number;
    actual_payout: number | null;
    status: string;
    created_at: string;
    users: { username: string };
    matches: { home_team: string; away_team: string };
}

export default function AdminBetsPage() {
    const [bets, setBets] = useState<BetRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "pending" | "won" | "lost" | "void">("all");
    const [processing, setProcessing] = useState<string | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { loadBets(); }, [filter]);

    async function loadBets() {
        setLoading(true);
        let query = supabase
            .from("bets")
            .select("*, users(username), matches(home_team, away_team)")
            .order("created_at", { ascending: false })
            .limit(100);

        if (filter !== "all") query = query.eq("status", filter);

        const { data } = await query;
        setBets((data as BetRow[]) || []);
        setLoading(false);
    }

    async function handleSettle(bet: BetRow, won: boolean) {
        setProcessing(bet.id);

        const payout = won ? bet.potential_payout : 0;
        const newStatus = won ? "won" : "lost";

        // Update bet
        await supabase.from("bets").update({
            status: newStatus,
            actual_payout: payout,
        }).eq("id", bet.id);

        // Update user balance if won
        if (won) {
            const { data: user } = await supabase
                .from("users")
                .select("aura_balance, total_gained, win_count")
                .eq("id", bet.user_id)
                .single();

            if (user) {
                const profit = payout - bet.stake;
                await supabase.from("users").update({
                    aura_balance: user.aura_balance + payout,
                    total_gained: user.total_gained + profit,
                    win_count: user.win_count + 1,
                }).eq("id", bet.user_id);

                await supabase.from("notifications").insert({
                    user_id: bet.user_id,
                    type: "bet_won",
                    message: `Admin settled your bet — You won ${payout} AURA`,
                    aura_change: profit,
                });
            }
        } else {
            await supabase.from("notifications").insert({
                user_id: bet.user_id,
                type: "bet_lost",
                message: `Admin settled your bet — Better luck next time`,
                aura_change: -bet.stake,
            });
        }

        await loadBets();
        setProcessing(null);
    }

    async function handleVoid(bet: BetRow) {
        setProcessing(bet.id);

        await supabase.from("bets").update({
            status: "void",
            actual_payout: bet.stake,
        }).eq("id", bet.id);

        // Refund
        const { data: user } = await supabase
            .from("users")
            .select("aura_balance")
            .eq("id", bet.user_id)
            .single();

        if (user) {
            await supabase.from("users").update({
                aura_balance: user.aura_balance + bet.stake,
            }).eq("id", bet.user_id);

            await supabase.from("notifications").insert({
                user_id: bet.user_id,
                type: "bet_void",
                message: `Your bet was voided — ${bet.stake} AURA refunded`,
                aura_change: 0,
            });
        }

        await loadBets();
        setProcessing(null);
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="neon-green text-xl mb-1">BETS</h1>
                    <p className="text-faint text-xs">{bets.length} SHOWN</p>
                </div>
                <button onClick={loadBets} className="btn-pixel btn-ghost flex items-center gap-2 text-xs px-3 py-2">
                    <RefreshCw size={11} />
                    REFRESH
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {(["all", "pending", "won", "lost", "void"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-2 text-xs border-2 transition-all
              ${filter === f
                                ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                : "border-border text-faint hover:border-border2"
                            }`}
                    >
                        {f.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <p className="neon-green text-sm animate-pulse">LOADING...</p>
                    </div>
                ) : bets.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-faint text-sm">NO BETS FOUND</p>
                    </div>
                ) : (
                    <div className="divide-y-2 divide-border">
                        {bets.map(bet => (
                            <div key={bet.id} className="p-4 hover:bg-surface2 transition-colors">
                                <div className="flex items-start gap-4 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-green-DEFAULT text-xs">
                                                {bet.users?.username}
                                            </span>
                                            <span className="text-faint text-xs">·</span>
                                            <span className="text-white text-xs">
                                                {bet.matches?.home_team} vs {bet.matches?.away_team}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="badge text-blue-DEFAULT border-blue-DEFAULT bg-blue-dim">
                                                {marketLabel(bet.market_type as MarketType)}
                                            </span>
                                            <span className="text-white text-xs">
                                                {bet.outcome.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-faint text-xs">{timeAgo(bet.created_at)}</p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-white text-sm mb-1">{formatAura(bet.stake)}</p>
                                        <span className={`badge ${bet.status === "won"
                                                ? "text-green-DEFAULT border-green-DEFAULT bg-green-dim"
                                                : bet.status === "lost"
                                                    ? "text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim"
                                                    : bet.status === "void"
                                                        ? "text-faint border-border"
                                                        : "text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim"
                                            }`}>
                                            {bet.status.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Manual settle buttons — only for pending */}
                                    {bet.status === "pending" && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSettle(bet, true)}
                                                disabled={processing === bet.id}
                                                className="p-2 border-2 border-border hover:border-green-DEFAULT hover:text-green-DEFAULT text-faint transition-colors"
                                                title="Mark as Won"
                                            >
                                                <CheckCircle size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleSettle(bet, false)}
                                                disabled={processing === bet.id}
                                                className="p-2 border-2 border-border hover:border-pink-DEFAULT hover:text-pink-DEFAULT text-faint transition-colors"
                                                title="Mark as Lost"
                                            >
                                                <XCircle size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleVoid(bet)}
                                                disabled={processing === bet.id}
                                                className="p-2 border-2 border-border hover:border-yellow-DEFAULT hover:text-yellow-DEFAULT text-faint transition-colors text-xs px-2"
                                                title="Void Bet"
                                            >
                                                VOID
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}