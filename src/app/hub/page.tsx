"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Match } from "@/types";
import Flag from "@/components/ui/Flag";
import { formatKickoff } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    Globe, Calendar, MapPin,
    ChevronRight, RefreshCw, Clock, Lock
} from "lucide-react";

import { GROUPS, VENUES } from "@/lib/data";

const SYNC_KEY = "aura_hub_last_sync";
const SYNC_INTERVAL = 12 * 60 * 60 * 1000;
const REFRESH_COOLDOWN = 10 * 60 * 1000;

export default function HubPage() {
    const router = useRouter();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [tab, setTab] = useState<"groups" | "fixtures" | "venues">("groups");
    const [selectedStage, setSelectedStage] = useState<string>("all");
    const [competitionName, setCompetitionName] = useState("FIFA World Cup 2026");
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [refreshCooldown, setRefreshCooldown] = useState(0);
    const [fixturesReleased, setFixturesReleased] = useState(false);

    useEffect(() => {
        loadFromSupabase();
        checkAndSync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (refreshCooldown <= 0) return;
        const timer = setInterval(() => {
            setRefreshCooldown(prev => {
                if (prev <= 1000) { clearInterval(timer); return 0; }
                return prev - 1000;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [refreshCooldown]);

    async function loadFromSupabase() {
        const { data } = await supabase
            .from("matches")
            .select("*")
            .order("kickoff_time", { ascending: true });
        setMatches(data || []);
        setFixturesReleased((data?.length ?? 0) > 0);
        setLoading(false);
    }

    async function checkAndSync() {
        const lastSync = localStorage.getItem(SYNC_KEY);
        const now = Date.now();
        const shouldSync = !lastSync || now - parseInt(lastSync) > SYNC_INTERVAL;
        if (shouldSync) await runSync();
    }

    async function runSync() {
        setSyncing(true);
        try {
            const res = await fetch("/api/matches/sync");
            const data = await res.json();
            if (data.fixtures_released) {
                setFixturesReleased(true);
                if (data.competition) setCompetitionName(data.competition);
                const { data: freshMatches } = await supabase
                    .from("matches")
                    .select("*")
                    .order("kickoff_time", { ascending: true });
                setMatches(freshMatches || []);
            }
            localStorage.setItem(SYNC_KEY, String(Date.now()));
            setLastSynced(new Date().toLocaleTimeString());
        } catch {
            // silent fail
        }
        setSyncing(false);
    }

    async function handleManualRefresh() {
        if (refreshCooldown > 0 || syncing) return;
        setRefreshCooldown(REFRESH_COOLDOWN);
        await runSync();
    }

    function formatCooldown(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    const stages = [
        "all",
        ...Array.from(
            new Set(matches.map(m => m.group || m.stage).filter(Boolean))
        ),
    ];

    const filteredMatches =
        selectedStage === "all"
            ? matches
            : matches.filter(
                m => m.group === selectedStage || m.stage === selectedStage
            );

    if (loading) return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <p className="neon-green text-sm animate-pulse">LOADING HUB...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-bg crt flex flex-col">
            <main className="pt-20 pb-24 md:pb-6 flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4">

                {/* ── Header ── */}
                <div className="flex items-start justify-between mb-5 animate-slide-up gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Globe size={14} className="text-green-DEFAULT shrink-0" />
                            <h1 className="neon-green text-sm sm:text-xl">WORLD CUP HUB</h1>
                            {syncing && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-dim border border-yellow-DEFAULT">
                                    <RefreshCw size={9} className="text-yellow-DEFAULT animate-spin" />
                                    <span className="text-yellow-DEFAULT text-xs">SYNCING</span>
                                </div>
                            )}
                        </div>
                        <p className="text-faint text-xs leading-loose">
                            {competitionName.toUpperCase()} · USA · MEX · CAN
                        </p>
                        {lastSynced && (
                            <div className="flex items-center gap-1 mt-1">
                                <Clock size={9} className="text-faint" />
                                <p className="text-faint text-xs">SYNCED: {lastSynced}</p>
                            </div>
                        )}
                    </div>

                    {/* Refresh button */}
                    <button
                        onClick={handleManualRefresh}
                        disabled={refreshCooldown > 0 || syncing}
                        className={`btn-pixel flex items-center gap-1.5 text-xs px-3 py-2 shrink-0
                            ${refreshCooldown > 0 || syncing
                                ? "btn-ghost opacity-50 cursor-not-allowed"
                                : "btn-ghost"
                            }`}
                    >
                        {syncing ? (
                            <>
                                <RefreshCw size={10} className="animate-spin" />
                                <span className="hidden sm:inline">SYNCING</span>
                            </>
                        ) : refreshCooldown > 0 ? (
                            <>
                                <Lock size={10} />
                                <span className="hidden sm:inline">SYNCED</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw size={10} />
                                SYNC
                            </>
                        )}
                    </button>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 stagger">
                    {[
                        { label: "TEAMS", value: "48", sub: "BIGGEST EVER" },
                        { label: "MATCHES", value: "104", sub: "ALL FIXTURES" },
                        { label: "HOSTS", value: "3", sub: "USA·MEX·CAN" },
                        {
                            label: "LIVE NOW",
                            value: String(matches.filter(m => m.status === "live").length),
                            sub: "IN PROGRESS",
                        },
                    ].map(s => (
                        <div key={s.label} className="card p-3 text-center">
                            <p className="text-faint text-xs mb-1.5">{s.label}</p>
                            <p className="neon-green text-xl mb-1">{s.value}</p>
                            <p className="text-faint" style={{ fontSize: "7px" }}>{s.sub}</p>
                        </div>
                    ))}
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-0 mb-5 border-2 border-border overflow-hidden">
                    {(["groups", "fixtures", "venues"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-3 text-xs transition-all touch-manipulation
                                ${tab === t
                                    ? "bg-green-dim text-green-DEFAULT border-r-2 border-l-2 border-green-DEFAULT -mx-px relative z-10"
                                    : "text-faint hover:text-white hover:bg-surface2"
                                }`}
                        >
                            {t === "groups" ? "GROUPS" : t === "fixtures" ? "FIXTURES" : "VENUES"}
                        </button>
                    ))}
                </div>

                {/* ── GROUPS TAB ── */}
                {tab === "groups" && (
                    <div>
                        {/* Legend */}
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            {[
                                { label: "HOST", color: "text-green-DEFAULT border-green-DEFAULT bg-green-dim" },
                                { label: "PLAYOFF", color: "text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim" },
                                { label: "DEBUT", color: "text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim" },
                            ].map(l => (
                                <span key={l.label} className={`badge ${l.color}`}>{l.label}</span>
                            ))}
                            <span className="text-faint ml-auto" style={{ fontSize: "7px" }}>
                                48 TEAMS · APRIL 2026
                            </span>
                        </div>

                        {/* Groups grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
                            {GROUPS.map(group => (
                                <div key={group.name} className="card overflow-hidden card-hover" style={{ padding: 0 }}>
                                    {/* Group header */}
                                    <div className="bg-surface2 border-b-2 border-border px-3 py-2.5 flex items-center justify-between">
                                        <h3 className="text-green-DEFAULT text-xs">{group.name}</h3>
                                        <span className="text-faint" style={{ fontSize: "7px" }}>4 TEAMS</span>
                                    </div>
                                    {/* Teams */}
                                    <div className="divide-y divide-border/40">
                                        {group.teams.map((team, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface2 transition-colors active:bg-surface2"
                                            >
                                                <div className="w-[1.9rem] flex justify-center shrink-0">
                                                    <Flag emoji={team.flag} size={24} />
                                                </div>
                                                <span className="text-white text-xs flex-1 leading-relaxed truncate">
                                                    {team.name.toUpperCase()}
                                                </span>
                                                <div className="flex gap-1 shrink-0">
                                                    {team.host && (
                                                        <span className="badge text-green-DEFAULT border-green-DEFAULT bg-green-dim">HOST</span>
                                                    )}
                                                    {team.playoff && (
                                                        <span className="badge text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim">PO</span>
                                                    )}
                                                    {team.debut && (
                                                        <span className="badge text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim">NEW</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Fun facts */}
                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-pink-dim border-2 border-pink-DEFAULT p-4">
                                <p className="text-pink-DEFAULT text-xs mb-2">⚠ GROUP OF DEATH</p>
                                <p className="text-white text-xs mb-1.5">GROUP F — NETHERLANDS · JAPAN · SWEDEN · TUNISIA</p>
                                <p className="text-faint" style={{ fontSize: "8px" }}>TOUGHEST GROUP IN THE TOURNAMENT</p>
                            </div>
                            <div className="bg-yellow-dim border-2 border-yellow-DEFAULT p-4">
                                <p className="text-yellow-DEFAULT text-xs mb-2">📖 DID YOU KNOW</p>
                                <p className="text-white text-xs mb-1.5">ITALY MISSED THE WORLD CUP AGAIN</p>
                                <p className="text-faint" style={{ fontSize: "8px" }}>LOST TO BOSNIA ON PENALTIES · 3RD STRAIGHT ABSENCE</p>
                            </div>
                            <div className="bg-blue-dim border-2 border-blue-DEFAULT p-4">
                                <p className="text-blue-DEFAULT text-xs mb-2">⚡ HISTORIC RETURN</p>
                                <p className="text-white text-xs mb-1.5">IRAQ BACK AFTER 40 YEARS</p>
                                <p className="text-faint" style={{ fontSize: "8px" }}>BEAT BOLIVIA 2-1 IN PLAYOFF FINAL · LAST APPEARED IN 1986</p>
                            </div>
                            <div className="bg-green-dim border-2 border-green-DEFAULT p-4">
                                <p className="text-green-DEFAULT text-xs mb-2">🌍 WORLD CUP DEBUTS</p>
                                <p className="text-white text-xs mb-1.5">CURACAO · CAPE VERDE · UZBEKISTAN · JORDAN</p>
                                <p className="text-faint" style={{ fontSize: "8px" }}>4 NATIONS AT THEIR FIRST EVER WORLD CUP</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── FIXTURES TAB ── */}
                {tab === "fixtures" && (
                    <>
                        {!fixturesReleased || matches.length === 0 ? (
                            <div className="card p-8 sm:p-16 text-center animate-slide-up">
                                <Globe size={36} className="text-faint mx-auto mb-5" />
                                <h2 className="text-white text-sm mb-3">FIXTURES NOT IN DATABASE YET</h2>
                                <p className="text-faint text-xs leading-loose mb-6 max-w-xs mx-auto">
                                    THE FULL MATCH SCHEDULE WILL APPEAR HERE AUTOMATICALLY
                                    ONCE THE FOOTBALL API PUBLISHES THE 2026 FIXTURE LIST.
                                    THE PAGE AUTO-SYNCS EVERY 12 HOURS.
                                </p>
                                <div className="bg-green-dim border-2 border-green-DEFAULT p-4 max-w-xs mx-auto mb-6">
                                    <p className="text-green-DEFAULT text-xs leading-loose">
                                        ⚽ WORLD CUP 2026<br />
                                        JUNE 11 — JULY 19, 2026<br />
                                        USA · MEXICO · CANADA<br />
                                        48 TEAMS · 104 MATCHES
                                    </p>
                                </div>
                                <button
                                    onClick={handleManualRefresh}
                                    disabled={refreshCooldown > 0 || syncing}
                                    className="btn-pixel btn-ghost flex items-center gap-2 mx-auto text-xs px-4 py-3 disabled:opacity-50"
                                >
                                    <RefreshCw size={10} className={syncing ? "animate-spin" : ""} />
                                    {refreshCooldown > 0
                                        ? `WAIT ${formatCooldown(refreshCooldown)}`
                                        : "CHECK NOW"}
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Stage filter - horizontally scrollable */}
                                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none">
                                    {stages.map(stage => (
                                        <button
                                            key={stage}
                                            onClick={() => setSelectedStage(stage)}
                                            className={`px-3 py-2 text-xs border-2 transition-all whitespace-nowrap shrink-0 touch-manipulation
                                                ${selectedStage === stage
                                                    ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                                    : "border-border text-faint hover:border-border2"
                                                }`}
                                        >
                                            {stage === "all" ? "ALL" : stage.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                {/* Match list */}
                                <div className="space-y-2 stagger">
                                    {filteredMatches.map(match => (
                                        <div
                                            key={match.id}
                                            onClick={() => router.push(`/match/${match.id}`)}
                                            className="card card-hover cursor-pointer active:scale-[0.99]"
                                            style={{ padding: "10px 12px" }}
                                        >
                                            {/* Stage badge + status row */}
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="badge text-faint border-border">
                                                    {match.group 
                                                        ? (match.group.toUpperCase().includes("GROUP") ? match.group.toUpperCase() : `GROUP ${match.group.toUpperCase()}`)
                                                        : (match.stage ? match.stage.toUpperCase().replace(/_/g, " ") : "")}
                                                </span>
                                                <span className={`badge flex-shrink-0 ${match.status === "live"
                                                    ? "text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim"
                                                    : match.status === "upcoming"
                                                        ? "text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim"
                                                        : "text-faint border-border"
                                                    }`}>
                                                    {match.status === "live" ? (
                                                        <span className="flex items-center gap-1">
                                                            <span className="live-dot" />LIVE
                                                        </span>
                                                    ) : match.status.toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Teams row */}
                                            <div className="flex items-center gap-2">
                                                <Flag emoji={match.home_flag} size={20} />
                                                <span className="text-white text-xs flex-1 break-words leading-tight">
                                                    {match.home_team.toUpperCase()}
                                                </span>

                                                {match.status === "finished" || match.status === "live" ? (
                                                    <span className={`text-xs font-bold shrink-0 px-2
                                                        ${match.status === "live" ? "text-pink-DEFAULT" : "text-white"}`}>
                                                        {match.home_score} — {match.away_score}
                                                    </span>
                                                ) : (
                                                    <span className="text-faint text-xs shrink-0 px-2">VS</span>
                                                )}

                                                <span className="text-white text-xs flex-1 break-words leading-tight text-right">
                                                    {match.away_team.toUpperCase()}
                                                </span>
                                                <Flag emoji={match.away_flag} size={20} />
                                                <ChevronRight size={12} className="text-faint flex-shrink-0 ml-1" />
                                            </div>

                                            {/* Date + venue row */}
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                <div className="flex items-center gap-1 text-faint text-xs">
                                                    <Calendar size={9} />
                                                    {formatKickoff(match.kickoff_time)}
                                                </div>
                                                {match.venue && (
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={9} className="text-faint" />
                                                        <span className="text-faint text-xs truncate max-w-[140px] sm:max-w-none">
                                                            {match.venue}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* ── VENUES TAB ── */}
                {tab === "venues" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
                        {VENUES.map((venue, i) => {
                            const matchCount = matches.filter(m =>
                                m.venue?.includes(venue.name)
                            ).length;
                            return (
                                <div key={i} className="card p-4 card-hover">
                                    <div className="flex items-start gap-3">
                                        <Flag emoji={venue.country} size={28} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2 mb-1 flex-wrap">
                                                <p className="text-white text-xs leading-normal">{venue.name.toUpperCase()}</p>
                                                {venue.note && (
                                                    <span className="badge text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim shrink-0">
                                                        {venue.note}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-faint text-xs mb-3">{venue.city.toUpperCase()}</p>
                                            <span className="badge text-green-DEFAULT border-green-DEFAULT bg-green-dim">
                                                {matchCount > 0 ? `${matchCount} MATCHES` : "VENUE CONFIRMED"}
                                            </span>
                                        </div>
                                        <MapPin size={11} className="text-faint shrink-0 mt-0.5" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="mt-8 border-2 border-border p-4 text-center animate-slide-up">
                    <p className="text-faint text-xs leading-loose">
                        ⚡ AUTO-SYNCS EVERY 12H · MANUAL REFRESH EVERY 10 MINS · ALL TIMES UTC
                    </p>
                </div>
            </main>
        </div>
    );
}