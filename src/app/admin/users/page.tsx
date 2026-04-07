"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatAura, winRate } from "@/lib/utils";
import { Search, Ban, RefreshCw, RotateCcw } from "lucide-react";

interface UserRow {
    id: string;
    username: string;
    avatar_url: string | null;
    aura_balance: number;
    total_bets: number;
    win_count: number;
    loss_count: number;
    streak: number;
    is_admin: boolean;
    is_banned: boolean;
    created_at: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => { loadUsers(); }, []);

    async function loadUsers() {
        setLoading(true);
        const { data } = await supabase
            .from("users")
            .select("*")
            .order("aura_balance", { ascending: false });
        setUsers(data || []);
        setLoading(false);
    }

    async function handleBan(user: UserRow) {
        if (!confirm(`Ban ${user.username}? They won't be able to place bets.`)) return;
        setProcessing(user.id);
        await supabase.from("users").update({ is_banned: true }).eq("id", user.id);
        await loadUsers();
        setProcessing(null);
    }

    async function handleUnban(user: UserRow) {
        setProcessing(user.id);
        await supabase.from("users").update({ is_banned: false }).eq("id", user.id);
        await loadUsers();
        setProcessing(null);
    }

    async function handleReset(user: UserRow) {
        if (!confirm(`Reset ${user.username}'s balance to 100 🤫? This cannot be undone.`)) return;
        setProcessing(user.id);
        await supabase.from("users").update({
            aura_balance: 100,
            total_gained: 0,
            total_lost: 0,
            total_bets: 0,
            win_count: 0,
            loss_count: 0,
            biggest_win: 0,
        }).eq("id", user.id);
        await supabase.from("notifications").insert({
            user_id: user.id,
            type: "bet_void",
            message: "Your account has been reset by admin",
            aura_change: 0,
        });
        await loadUsers();
        setProcessing(null);
    }

    const filtered = users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="neon-green text-xl mb-1">USERS</h1>
                    <p className="text-faint text-xs">{users.length} TOTAL</p>
                </div>
                <button onClick={loadUsers} className="btn-pixel btn-ghost flex items-center gap-2 text-xs px-3 py-2">
                    <RefreshCw size={11} />
                    REFRESH
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="SEARCH USERNAME..."
                    className="pixel-input pl-9"
                />
            </div>

            <div className="card overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 p-3 border-b-2 border-border bg-surface2 text-faint text-xs">
                    <div className="col-span-3">PLAYER</div>
                    <div className="col-span-2 text-right">BALANCE</div>
                    <div className="col-span-2 text-right">WIN RATE</div>
                    <div className="col-span-2 text-right">BETS</div>
                    <div className="col-span-3 text-right">ACTIONS</div>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <p className="neon-green text-sm animate-pulse">LOADING...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-faint text-sm">NO USERS FOUND</p>
                    </div>
                ) : (
                    filtered.map(user => (
                        <div
                            key={user.id}
                            className={`grid grid-cols-12 gap-2 p-3 border-b-2 border-border items-center
                hover:bg-surface2 transition-colors
                ${user.is_banned ? "opacity-50" : ""}
              `}
                        >
                            {/* Player */}
                            <div className="col-span-3 flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 border-2 border-border flex-shrink-0 overflow-hidden">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-surface2 flex items-center justify-center">
                                            <span className="text-faint text-xs">
                                                {user.username?.slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white text-xs truncate">{user.username}</p>
                                    <div className="flex gap-1 mt-0.5">
                                        {user.is_admin && (
                                            <span className="badge text-green-DEFAULT border-green-DEFAULT bg-green-dim">ADMIN</span>
                                        )}
                                        {user.is_banned && (
                                            <span className="badge text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim">BANNED</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Balance */}
                            <div className="col-span-2 text-right">
                                <p className="text-green-DEFAULT text-xs">{formatAura(user.aura_balance)}</p>
                            </div>

                            {/* Win rate */}
                            <div className="col-span-2 text-right">
                                <p className="text-muted text-xs">{winRate(user.win_count, user.total_bets)}</p>
                            </div>

                            {/* Bets */}
                            <div className="col-span-2 text-right">
                                <p className="text-faint text-xs">{user.total_bets}</p>
                            </div>

                            {/* Actions */}
                            <div className="col-span-3 flex justify-end gap-1">
                                {user.is_banned ? (
                                    <button
                                        onClick={() => handleUnban(user)}
                                        disabled={processing === user.id}
                                        className="px-2 py-1 border-2 border-green-DEFAULT text-green-DEFAULT text-xs hover:bg-green-dim transition-colors"
                                    >
                                        UNBAN
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleBan(user)}
                                        disabled={processing === user.id || user.is_admin}
                                        className="p-1 border-2 border-border hover:border-pink-DEFAULT hover:text-pink-DEFAULT text-faint transition-colors disabled:opacity-30"
                                        title="Ban user"
                                    >
                                        <Ban size={11} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleReset(user)}
                                    disabled={processing === user.id || user.is_admin}
                                    className="p-1 border-2 border-border hover:border-yellow-DEFAULT hover:text-yellow-DEFAULT text-faint transition-colors disabled:opacity-30"
                                    title="Reset balance"
                                >
                                    <RotateCcw size={11} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}