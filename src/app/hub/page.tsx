"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Match } from "@/types";
import Navbar from "@/components/layout/Navbar";
import { formatKickoff } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Globe, Calendar, MapPin, ChevronRight } from "lucide-react";

const GROUPS = [
    { name: "GROUP A", teams: [{ name: "USA", flag: "us" }, { name: "Mexico", flag: "mx" }, { name: "Canada", flag: "ca" }, { name: "TBD", flag: "" }] },
    { name: "GROUP B", teams: [{ name: "Brazil", flag: "br" }, { name: "Argentina", flag: "ar" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP C", teams: [{ name: "France", flag: "fr" }, { name: "England", flag: "gb-eng" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP D", teams: [{ name: "Spain", flag: "es" }, { name: "Germany", flag: "de" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP E", teams: [{ name: "Portugal", flag: "pt" }, { name: "Belgium", flag: "be" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP F", teams: [{ name: "Netherlands", flag: "nl" }, { name: "Italy", flag: "it" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP G", teams: [{ name: "Japan", flag: "jp" }, { name: "South Korea", flag: "kr" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP H", teams: [{ name: "Morocco", flag: "ma" }, { name: "Senegal", flag: "sn" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP I", teams: [{ name: "Australia", flag: "au" }, { name: "Saudi Arabia", flag: "sa" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP J", teams: [{ name: "Colombia", flag: "co" }, { name: "Ecuador", flag: "ec" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP K", teams: [{ name: "Croatia", flag: "hr" }, { name: "Serbia", flag: "rs" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
    { name: "GROUP L", teams: [{ name: "Nigeria", flag: "ng" }, { name: "Ghana", flag: "gh" }, { name: "TBD", flag: "" }, { name: "TBD", flag: "" }] },
];

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

export default function HubPage() {
    const router = useRouter();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"groups" | "fixtures" | "venues">("groups");
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from("matches")
                .select("*")
                .order("kickoff_time", { ascending: true });
            setMatches(data || []);
            setLoading(false);
        }
        load();
    }, []);

    const groupedMatches = matches.reduce((acc, match) => {
        const key = match.group || match.stage;
        if (!acc[key]) acc[key] = [];
        acc[key].push(match);
        return acc;
    }, {} as Record<string, Match[]>);

    const filteredMatches = selectedGroup
        ? matches.filter(m => m.group === selectedGroup || m.stage === selectedGroup)
        : matches;

    if (loading) return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <p className="neon-green text-sm animate-pulse">LOADING HUB...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-bg crt">
            <Navbar />
            <main className="pt-16 max-w-6xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="text-center my-10 animate-slide-up">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <Globe size={20} className="text-green-DEFAULT" />
                        <h1 className="neon-green text-2xl">WORLD CUP HUB</h1>
                        <Globe size={20} className="text-green-DEFAULT" />
                    </div>
                    <p className="text-faint text-xs">FIFA WORLD CUP 2026 · USA · MEXICO · CANADA</p>
                    <p className="text-faint text-xs mt-1">48 TEAMS · 104 MATCHES · JUNE–JULY 2026</p>
                </div>

                {/* Stats banner */}
                <div className="grid grid-cols-3 gap-3 mb-8 stagger">
                    {[
                        { label: "HOST NATIONS", value: "3", sub: "USA · MEX · CAN" },
                        { label: "TOTAL TEAMS", value: "48", sub: "FIRST TIME EVER" },
                        { label: "TOTAL MATCHES", value: "104", sub: "64 IN PREV WC" },
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
                    {(["groups", "fixtures", "venues"] as const).map(t => (
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

                {/* GROUPS TAB */}
                {tab === "groups" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
                        {GROUPS.map(group => (
                            <div key={group.name} className="card overflow-hidden card-hover">
                                <div className="bg-surface2 border-b-2 border-border p-3 flex items-center justify-between">
                                    <h3 className="text-green-DEFAULT text-sm">{group.name}</h3>
                                    <span className="text-faint text-xs">4 TEAMS</span>
                                </div>
                                <div className="p-3 space-y-2">
                                    {group.teams.map((team, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-surface2 transition-colors">
                                            {team.flag ? (
                                                <img src={`https://flagcdn.com/w40/${team.flag}.png`} alt={team.name} className="w-6 h-4 object-cover flex-shrink-0 rounded-[2px]" />
                                            ) : (
                                                <span className="text-2xl">🏳️</span>
                                            )}
                                            <span className={`text-sm ${team.name === "TBD" ? "text-faint" : "text-white"}`}>
                                                {team.name.toUpperCase()}
                                            </span>
                                            {team.name === "TBD" && (
                                                <span className="ml-auto badge text-faint border-border">
                                                    QUALIFIER
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* FIXTURES TAB */}
                {tab === "fixtures" && (
                    <div>
                        {/* Group filter */}
                        <div className="flex gap-2 mb-6 flex-wrap">
                            <button
                                onClick={() => setSelectedGroup(null)}
                                className={`px-3 py-1 text-xs border-2 transition-all
                  ${!selectedGroup
                                        ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                        : "border-border text-faint hover:border-border2"
                                    }`}
                            >
                                ALL
                            </button>
                            {Object.keys(groupedMatches).map(group => (
                                <button
                                    key={group}
                                    onClick={() => setSelectedGroup(group)}
                                    className={`px-3 py-1 text-xs border-2 transition-all
                    ${selectedGroup === group
                                            ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                            : "border-border text-faint hover:border-border2"
                                        }`}
                                >
                                    {group.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {filteredMatches.length === 0 ? (
                            <div className="card p-12 text-center">
                                <p className="text-faint text-sm">NO FIXTURES ADDED YET</p>
                                <p className="text-faint text-xs mt-2">
                                    MATCHES WILL APPEAR HERE ONCE THE TOURNAMENT BEGINS
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 stagger">
                                {filteredMatches.map(match => (
                                    <div
                                        key={match.id}
                                        onClick={() => router.push(`/match/${match.id}`)}
                                        className="card card-hover cursor-pointer p-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Group/Stage */}
                                            <div className="hidden md:block w-24 flex-shrink-0">
                                                <span className="badge text-faint border-border">
                                                    {(match.group || match.stage).toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Teams */}
                                            <div className="flex items-center gap-3 flex-1">
                                                {match.home_flag?.startsWith('http') ? (
                                                    <img src={match.home_flag} alt={match.home_team} className="w-6 h-4 object-cover flex-shrink-0 rounded-[2px]" />
                                                ) : (
                                                    <span className="text-xl">{match.home_flag}</span>
                                                )}
                                                <span className="text-white text-sm">
                                                    {match.home_team.toUpperCase()}
                                                </span>

                                                {match.status === "finished" || match.status === "live" ? (
                                                    <span className={`px-3 text-sm font-bold
                            ${match.status === "live" ? "text-pink-DEFAULT" : "text-white"}`}>
                                                        {match.home_score} — {match.away_score}
                                                    </span>
                                                ) : (
                                                    <span className="px-3 text-faint text-xs">VS</span>
                                                )}

                                                <span className="text-white text-sm">
                                                    {match.away_team.toUpperCase()}
                                                </span>
                                                {match.away_flag?.startsWith('http') ? (
                                                    <img src={match.away_flag} alt={match.away_team} className="w-6 h-4 object-cover flex-shrink-0 rounded-[2px]" />
                                                ) : (
                                                    <span className="text-xl">{match.away_flag}</span>
                                                )}
                                            </div>

                                            {/* Date + Status */}
                                            <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                                                <div className="flex items-center gap-1 text-faint text-xs">
                                                    <Calendar size={10} />
                                                    {formatKickoff(match.kickoff_time)}
                                                </div>
                                                <span className={`badge ${match.status === "live"
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

                                            <ChevronRight size={14} className="text-faint flex-shrink-0" />
                                        </div>

                                        {/* Venue */}
                                        {match.venue && (
                                            <div className="flex items-center gap-1 mt-3 pl-0 md:pl-28">
                                                <MapPin size={10} className="text-faint" />
                                                <span className="text-faint text-xs">{match.venue}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* VENUES TAB */}
                {tab === "venues" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
                        {VENUES.map((venue, i) => {
                            const matchCount = matches.filter(m => m.venue === venue).length;
                            const countryCode = venue.includes("Mexico") ? "mx"
                                : venue.includes("Vancouver") ? "ca"
                                    : "us";
                            return (
                                <div key={i} className="card p-4 card-hover">
                                    <div className="flex items-start gap-3">
                                        <img src={`https://flagcdn.com/w40/${countryCode}.png`} alt="country flag" className="w-8 h-5.5 object-cover flex-shrink-0 rounded-[2px] mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-white text-sm mb-1">
                                                {venue.split(",")[0].toUpperCase()}
                                            </p>
                                            <p className="text-faint text-xs mb-3">
                                                {venue.split(",")[1]?.trim().toUpperCase()}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <span className="badge text-green-DEFAULT border-green-DEFAULT bg-green-dim">
                                                    {matchCount > 0 ? `${matchCount} MATCHES` : "VENUE CONFIRMED"}
                                                </span>
                                            </div>
                                        </div>
                                        <MapPin size={14} className="text-faint flex-shrink-0" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer note */}
                <div className="mt-10 border-2 border-border p-4 text-center animate-slide-up">
                    <p className="text-faint text-xs leading-loose">
                        ⚽ FULL FIXTURE LIST WILL BE UPDATED ONCE THE 2026 WORLD CUP DRAW IS FINALIZED.
                        ALL MATCH TIMES SHOWN IN YOUR LOCAL TIMEZONE.
                    </p>
                </div>
            </main>
        </div>
    );
}