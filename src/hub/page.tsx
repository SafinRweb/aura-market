"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Match } from "@/types";
import Navbar from "@/components/layout/Navbar";
import { formatKickoff } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    Globe, Calendar, MapPin,
    ChevronRight, RefreshCw, Clock
} from "lucide-react";

export default function HubPage() {
    const router = useRouter();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [fixturesReleased, setFixturesReleased] = useState<boolean | null>(null);
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [tab, setTab] = useState<"fixtures" | "venues">("fixtures");
    const [selectedStage, setSelectedStage] = useState<string>("all");
    const [competitionName, setCompetitionName] = useState("FIFA World Cup 2026");

    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function syncFromApi() {
        setSyncing(true);
        try {
            const res = await fetch("/api/matches/sync");
            const data = await res.json();
            setFixturesReleased(data.fixtures_released ?? false);
            if (data.competition) setCompetitionName(data.competition);
            setLastSynced(new Date().toLocaleTimeString());
        } catch {
            setFixturesReleased(false);
        }
        setSyncing(false);
    }

    async function loadData() {
        setLoading(true);

        // Sync from API first
        await syncFromApi();

        // Then load from Supabase
        const { data } = await supabase
            .from("matches")
            .select("*")
            .order("kickoff_time", { ascending: true });

        setMatches(data || []);
        setLoading(false);
    }

    async function handleRefresh() {
        setSyncing(true);
        await syncFromApi();
        const { data } = await supabase
            .from("matches")
            .select("*")
            .order("kickoff_time", { ascending: true });
        setMatches(data || []);
        setSyncing(false);
    }

    // Get unique stages
    const stages = ["all", ...Array.from(new Set(matches.map(m => m.group || m.stage).filter(Boolean)))];

    const filteredMatches = selectedStage === "all"
        ? matches
        : matches.filter(m => m.group === selectedStage || m.stage === selectedStage);

    // Get unique venues
    const venues = Array.from(new Set(matches.map(m => m.venue).filter(Boolean)));

    const VENUES = [
        "MetLife Stadium, New York",
        "SoFi Stadium, Los Angeles",
        "AT&T Stadium, Dallas",
        "Estadio Azteca, Mexico City",
        "Arrowhead Stadium, Kansas City",
        "Levi's Stadium, San Francisco",
        "Rose Bowl, Los Angeles",
        "Hard Rock Stadium, Miami",
        "Gillette Stadium, Boston",
        "Lincoln Financial Field, Philadelphia",
        "Lumen Field, Seattle",
        "BC Place, Vancouver",
    ];

    const displayVenues = venues.length > 0 ? venues : VENUES;

    if (loading) return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <div className="text-center">
                <RefreshCw size={24} className="text-green-DEFAULT mx-auto mb-4 animate-spin" />
                <p className="neon-green text-sm">SYNCING FIXTURES...</p>
                <p className="text-faint text-xs mt-2">FETCHING FROM FOOTBALL API</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-bg crt">
            <Navbar />
            <main className="pt-16 max-w-6xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="flex items-start justify-between mb-8 animate-slide-up">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Globe size={18} className="text-green-DEFAULT" />
                            <h1 className="neon-green text-xl">WORLD CUP HUB</h1>
                        </div>
                        <p className="text-faint text-xs">{competitionName.toUpperCase()}</p>
                        {lastSynced && (
                            <div className="flex items-center gap-1 mt-1">
                                <Clock size={9} className="text-faint" />
                                <p className="text-faint text-xs">LAST SYNCED: {lastSynced}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={syncing}
                        className="btn-pixel btn-ghost flex items-center gap-2 text-xs px-3 py-2"
                    >
                        <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
                        {syncing ? "SYNCING..." : "REFRESH"}
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-8 stagger">
                    {[
                        { label: "TOTAL MATCHES", value: String(matches.length), sub: matches.length === 0 ? "PENDING RELEASE" : "FIXTURES LOADED" },
                        { label: "LIVE NOW", value: String(matches.filter(m => m.status === "live").length), sub: "MATCHES IN PROGRESS" },
                        { label: "UPCOMING", value: String(matches.filter(m => m.status === "upcoming").length), sub: "YET TO KICK OFF" },
                    ].map(s => (
                        <div key={s.label} className="card p-4 text-center">
                            <p className="text-faint text-xs mb-2">{s.label}</p>
                            <p className="neon-green text-2xl mb-1">{s.value}</p>
                            <p className="text-faint text-xs">{s.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(["fixtures", "venues"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 text-xs border-2 transition-all
                ${tab === t
                                    ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                    : "border-border text-faint hover:border-border2"
                                }`}
                        >
                            {t.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* FIXTURES TAB */}
                {tab === "fixtures" && (
                    <>
                        {fixturesReleased === false && matches.length === 0 ? (
                            // No data state
                            <div className="card p-16 text-center animate-slide-up">
                                <Globe size={40} className="text-faint mx-auto mb-6" />
                                <h2 className="text-white text-lg mb-3">FIXTURES NOT RELEASED YET</h2>
                                <p className="text-faint text-xs leading-loose mb-6">
                                    THE OFFICIAL 2026 WORLD CUP FIXTURE LIST HAS NOT BEEN
                                    PUBLISHED YET. THIS PAGE WILL AUTOMATICALLY UPDATE
                                    THE MOMENT FIXTURES ARE RELEASED.
                                </p>
                                <div className="bg-green-dim border-2 border-green-DEFAULT p-4 max-w-sm mx-auto">
                                    <p className="text-green-DEFAULT text-xs leading-loose">
                                        ⚽ WORLD CUP 2026<br />
                                        JUNE — JULY 2026<br />
                                        USA · MEXICO · CANADA<br />
                                        48 TEAMS · 104 MATCHES
                                    </p>
                                </div>
                                <button
                                    onClick={handleRefresh}
                                    disabled={syncing}
                                    className="btn-pixel btn-ghost mt-6 flex items-center gap-2 mx-auto text-xs px-4 py-2"
                                >
                                    <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
                                    CHECK AGAIN
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Stage filter */}
                                <div className="flex gap-2 mb-5 flex-wrap">
                                    {stages.map(stage => (
                                        <button
                                            key={stage}
                                            onClick={() => setSelectedStage(stage)}
                                            className={`px-3 py-1 text-xs border-2 transition-all
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
                                <div className="space-y-3 stagger">
                                    {filteredMatches.map(match => (
                                        <div
                                            key={match.id}
                                            onClick={() => router.push(`/match/${match.id}`)}
                                            className="card card-hover cursor-pointer p-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Stage badge */}
                                                <div className="hidden md:block w-28 flex-shrink-0">
                                                    <span className="badge text-faint border-border">
                                                        {(match.group || match.stage || "").toUpperCase()}
                                                    </span>
                                                </div>

                                                {/* Teams */}
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {match.home_flag?.startsWith('http') ? (
                                                        <img src={match.home_flag} alt={match.home_team} className="w-6 h-4.5 object-cover flex-shrink-0 rounded-[2px]" />
                                                    ) : (
                                                        <span className="text-xl flex-shrink-0">{match.home_flag}</span>
                                                    )}
                                                    <span className="text-white text-sm truncate">
                                                        {match.home_team.toUpperCase()}
                                                    </span>

                                                    {match.status === "finished" || match.status === "live" ? (
                                                        <span className={`px-3 text-sm font-bold flex-shrink-0
                              ${match.status === "live" ? "neon-pink" : "text-white"}`}>
                                                            {match.home_score} — {match.away_score}
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 text-faint text-xs flex-shrink-0">VS</span>
                                                    )}

                                                    <span className="text-white text-sm truncate">
                                                        {match.away_team.toUpperCase()}
                                                    </span>
                                                    {match.away_flag?.startsWith('http') ? (
                                                        <img src={match.away_flag} alt={match.away_team} className="w-6 h-4.5 object-cover flex-shrink-0 rounded-[2px]" />
                                                    ) : (
                                                        <span className="text-xl flex-shrink-0">{match.away_flag}</span>
                                                    )}
                                                </div>

                                                {/* Date + Status */}
                                                <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
                                                    <div className="flex items-center gap-1 text-faint text-xs">
                                                        <Calendar size={10} />
                                                        {formatKickoff(match.kickoff_time)}
                                                    </div>
                                                    <span className={`badge flex-shrink-0 ${match.status === "live"
                                                            ? "text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim"
                                                            : match.status === "upcoming"
                                                                ? "text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim"
                                                                : match.status === "finished"
                                                                    ? "text-faint border-border"
                                                                    : "text-faint border-border"
                                                        }`}>
                                                        {match.status === "live" ? (
                                                            <span className="flex items-center gap-1">
                                                                <span className="live-dot" />LIVE
                                                            </span>
                                                        ) : match.status.toUpperCase()}
                                                    </span>
                                                </div>

                                                <ChevronRight size={14} className="text-faint flex-shrink-0" />
                                            </div>

                                            {match.venue && (
                                                <div className="flex items-center gap-1 mt-3 md:pl-32">
                                                    <MapPin size={9} className="text-faint" />
                                                    <span className="text-faint text-xs">{match.venue}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* VENUES TAB */}
                {tab === "venues" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
                        {displayVenues.map((venue, i) => {
                            const matchCount = matches.filter(m => m.venue === venue).length;
                            const countryCode = typeof venue === "string" && (
                                venue.includes("Mexico") || venue.includes("Azteca") ? "mx"
                                    : venue.includes("Vancouver") || venue.includes("BC Place") ? "ca"
                                        : "us"
                            );

                            const venueName = typeof venue === "string"
                                ? venue.split(",")[0]
                                : venue;
                            const venueCity = typeof venue === "string"
                                ? venue.split(",")[1]?.trim()
                                : "";

                            return (
                                <div key={i} className="card p-4 card-hover">
                                    <div className="flex items-start gap-3">
                                        {countryCode ? (
                                            <img src={`https://flagcdn.com/w40/${countryCode}.png`} alt="country" className="w-8 h-5.5 object-cover flex-shrink-0 rounded-[2px] mt-0.5" />
                                        ) : (
                                            <span className="text-2xl flex-shrink-0">🏳️</span>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-white text-sm mb-1">
                                                {typeof venueName === "string" ? venueName.toUpperCase() : venueName}
                                            </p>
                                            {venueCity && (
                                                <p className="text-faint text-xs mb-3">
                                                    {venueCity.toUpperCase()}
                                                </p>
                                            )}
                                            <span className="badge text-green-DEFAULT border-green-DEFAULT bg-green-dim">
                                                {matchCount > 0 ? `${matchCount} MATCHES` : "VENUE CONFIRMED"}
                                            </span>
                                        </div>
                                        <MapPin size={14} className="text-faint flex-shrink-0" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-10 border-2 border-border p-4 text-center animate-slide-up">
                    <p className="text-faint text-xs leading-loose">
                        ⚡ FIXTURES AUTO-SYNC FROM OFFICIAL FOOTBALL API ·
                        DATA UPDATES EVERY HOUR ·
                        ALL TIMES IN UTC
                    </p>
                </div>
            </main>
        </div>
    );
}