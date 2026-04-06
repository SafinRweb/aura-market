"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeaderboardEntry } from "@/types";
import { formatAura, winRate, rankBadge } from "@/lib/utils";
import { Crown, Zap, Trophy } from "lucide-react";
import AuraCoin, { AuraAmount } from "@/components/ui/AuraCoin";

const EMOJI_STYLE: React.CSSProperties = {
  lineHeight: 1,
  display: "inline-block",
};

const MEDAL = ["👑", "⚡", "🔥"] as const;
const MEDAL_COLORS = [
  { border: "#ffbe0b", glow: "rgba(255,190,11,0.4)", text: "text-yellow-DEFAULT", bg: "bg-yellow-dim" },
  { border: "#aaaacc", glow: "rgba(170,170,204,0.3)", text: "text-muted", bg: "bg-surface2" },
  { border: "#ff006e", glow: "rgba(255,0,110,0.25)", text: "text-pink-DEFAULT", bg: "bg-pink-dim" },
];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("leaderboard").select("*").limit(100);
      setEntries(data || []);
      if (user) {
        const myEntry = data?.find(e => e.user_id === user.id);
        if (myEntry) setMyRank(myEntry);
      }
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("leaderboard")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users" }, async () => {
        const { data } = await supabase.from("leaderboard").select("*").limit(100);
        setEntries(data || []);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const displayed = showTop ? entries.slice(0, 10) : entries;
  const podium = entries.slice(0, 3);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="neon-green text-sm animate-pulse">LOADING RANKS...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg crt flex flex-col">
      <main className="pt-20 pb-24 md:pb-6 flex-1 max-w-3xl mx-auto w-full px-3 sm:px-4">

        {/* ── Header ── */}
        <div className="text-center mb-8 mt-2 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Crown size={16} className="text-yellow-DEFAULT" style={{ filter: "drop-shadow(0 0 6px rgba(255,190,11,0.8))" }} />
            <h1 className="neon-green text-lg sm:text-2xl">HALL OF FAME</h1>
            <Crown size={16} className="text-yellow-DEFAULT" style={{ filter: "drop-shadow(0 0 6px rgba(255,190,11,0.8))" }} />
          </div>
          <p className="text-faint text-xs">GLOBAL RANKINGS · TOP 100</p>
        </div>

        {/* ── Podium ── */}
        {podium.length >= 3 && (
          <div className="mb-8 animate-slide-up">
            <div className="relative">
              <div className="absolute inset-0 pointer-events-none" style={{
                background: "radial-gradient(ellipse at 50% 100%, rgba(255,190,11,0.08) 0%, transparent 70%)"
              }} />

              <div className="flex items-end justify-center gap-3 sm:gap-6 relative z-10 px-2">
                {[1, 0, 2].map(pos => {
                  const player = podium[pos];
                  const mc = MEDAL_COLORS[pos];
                  const heights = ["h-28 sm:h-32", "h-20 sm:h-24", "h-14 sm:h-18"];
                  return (
                    <div key={pos} className="flex flex-col items-center gap-1.5 flex-1 max-w-[110px]">
                      {pos === 0 && (
                        <span className="emoji text-3xl animate-float mb-1" style={EMOJI_STYLE}><AuraCoin size={60} /></span>
                      )}

                      {/* Avatar */}
                      <div
                        className="w-12 h-12 sm:w-16 sm:h-16 border-2 overflow-hidden shadow-lg transition-transform hover:-translate-y-1"
                        style={{ borderColor: mc.border, boxShadow: `0 0 20px ${mc.glow}` }}
                      >
                        {player?.avatar_url ? (
                          <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full ${mc.bg} flex items-center justify-center`}>
                            <span className={`${mc.text} text-xs sm:text-base`}>
                              {player?.username?.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Username */}
                      <p
                        className={`${mc.text} text-[9px] sm:text-[10px] text-center truncate w-full px-1`}
                        style={{ textShadow: `0 0 5px ${mc.glow}` }}
                      >
                        {player?.username?.toUpperCase()}
                      </p>

                      {/* Balance — shown on all screen sizes */}
                      <AuraAmount
                        amount={player?.aura_balance || 0}
                        size={12}
                        className={`${mc.text} text-[8px] sm:text-[10px]`}
                      />

                      {/* Podium block */}
                      <div
                        className={`w-full ${heights[pos]} border-2 flex flex-col items-center justify-center gap-1`}
                        style={{ borderColor: mc.border, background: "rgba(26,26,46,0.6)", boxShadow: `inset 0 0 15px ${mc.glow}` }}
                      >
                        <span className="emoji text-base sm:text-xl" style={EMOJI_STYLE}>{MEDAL[pos]}</span>
                        <span className={`${mc.text} text-xs font-bold`}>#{pos + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── My Rank Banner ── */}
        {myRank && (
          <div
            className="mb-5 p-3 sm:p-4 border-2 border-green-DEFAULT bg-green-dim animate-slide-up"
            style={{ boxShadow: "0 0 20px rgba(0,255,135,0.15)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Trophy size={14} className="text-green-DEFAULT animate-pulse shrink-0" />
                <div>
                  <span className="neon-green text-xs block mb-1">YOUR RANKING</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base">#{myRank.rank}</span>
                    {rankBadge(Number(myRank.rank)) && (
                      <span className="text-yellow-DEFAULT px-2 border border-yellow-DEFAULT/30 bg-yellow-DEFAULT/10" style={{ fontSize: "8px" }}>
                        {rankBadge(Number(myRank.rank))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-faint block mb-1" style={{ fontSize: "8px" }}>BALANCE</span>
                <AuraAmount amount={myRank.aura_balance} size={18} className="text-green-DEFAULT" />
              </div>
            </div>
          </div>
        )}

        {/* ── Filter toggle ── */}
        <div className="flex bg-surface2 border border-border p-1 mb-4">
          <button
            onClick={() => setShowTop(false)}
            className={`flex-1 py-3 text-xs transition-all text-center touch-manipulation ${!showTop
              ? "bg-bg text-green-DEFAULT border border-green-DEFAULT shadow-[0_0_10px_rgba(0,255,135,0.2)]"
              : "text-faint hover:text-white"
              }`}
          >
            ALL PLAYERS
          </button>
          <button
            onClick={() => setShowTop(true)}
            className={`flex-1 py-3 text-xs transition-all text-center touch-manipulation ${showTop
              ? "bg-bg text-yellow-DEFAULT border border-yellow-DEFAULT shadow-[0_0_10px_rgba(255,190,11,0.2)]"
              : "text-faint hover:text-white"
              }`}
          >
            TOP 10
          </button>
        </div>

        {/* ── Table ── */}
        <div className="card overflow-hidden animate-slide-up border-2" style={{ padding: 0 }}>
          {/* Table header */}
          <div className="flex items-center px-3 py-2.5 border-b-2 border-border bg-bg/50 text-faint" style={{ fontSize: "8px" }}>
            <div className="w-8 text-center shrink-0">#</div>
            <div className="flex-1 min-w-0 pl-2">PLAYER</div>
            <div className="w-14 text-center shrink-0 hidden sm:block">W/RATE</div>
            <div className="w-20 sm:w-24 text-right shrink-0">BALANCE</div>
          </div>

          <div className="divide-y divide-border/50">
            {displayed.length === 0 ? (
              <div className="p-12 text-center text-faint text-xs">AWAITING PLAYERS</div>
            ) : (
              displayed.map((entry) => {
                const isMe = entry.user_id === myRank?.user_id;
                const rank = Number(entry.rank);
                const mc = rank <= 3 ? MEDAL_COLORS[rank - 1] : null;

                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center px-3 py-3 transition-all hover:bg-surface/50 active:bg-surface/50
                      ${isMe ? "bg-green-dim/30" : ""}
                      ${rank === 1 ? "bg-yellow-dim/20" : ""}
                    `}
                    style={
                      isMe
                        ? { borderLeft: "3px solid #00ff87", backgroundColor: "rgba(0,255,135,0.05)" }
                        : mc
                          ? { borderLeft: `3px solid ${mc.border}` }
                          : { borderLeft: "3px solid transparent" }
                    }
                  >
                    {/* Rank number */}
                    <div className="w-8 text-center text-faint text-xs shrink-0">
                      {rank <= 3 ? (
                        <span className="emoji text-base" style={EMOJI_STYLE}>{MEDAL[rank - 1]}</span>
                      ) : (
                        <span className={isMe ? "text-green-DEFAULT font-bold" : ""}>{rank}</span>
                      )}
                    </div>

                    {/* Player info */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 pl-2">
                      {/* Avatar */}
                      <div
                        className="w-7 h-7 sm:w-9 sm:h-9 border shrink-0 overflow-hidden"
                        style={mc ? { borderColor: mc.border } : isMe ? { borderColor: "#00ff87" } : { borderColor: "#2a2a4a" }}
                      >
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-surface2 flex items-center justify-center">
                            <span className={`text-[8px] sm:text-xs ${mc ? mc.text : isMe ? "text-green-DEFAULT" : "text-faint"}`}>
                              {entry.username?.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Name + badge */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs truncate ${isMe ? "text-green-DEFAULT" : mc ? mc.text : "text-white"}`}>
                          {entry.username?.toUpperCase()}
                        </p>
                        {rankBadge(rank) && (
                          <p className="text-yellow-DEFAULT mt-0.5 opacity-80" style={{ fontSize: "7px" }}>
                            {rankBadge(rank)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Win rate — hidden on mobile */}
                    <div className="w-14 text-center text-faint hidden sm:flex flex-col justify-center">
                      <span style={{ fontSize: "9px" }}>{winRate(entry.win_count, entry.total_bets)}</span>
                    </div>

                    {/* Balance */}
                    <div className="w-20 sm:w-24 text-right shrink-0">
                      <AuraAmount
                        amount={entry.aura_balance}
                        size={12}
                        className={`text-[9px] sm:text-xs ${rank === 1 ? "text-yellow-DEFAULT" : isMe ? "text-green-DEFAULT" : "text-white"}`}
                      />
                      {/* Win rate on mobile — below balance */}
                      <p className="text-faint sm:hidden mt-0.5" style={{ fontSize: "7px" }}>
                        {winRate(entry.win_count, entry.total_bets)} W/R
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}