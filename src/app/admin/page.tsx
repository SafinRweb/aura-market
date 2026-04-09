"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatAura } from "@/lib/utils";
import { CustomEvent, CustomEventOption } from "@/types";
import {
    Users, Zap, TrendingUp,
    Activity, RefreshCw, AlertCircle, CheckCircle, Trash2
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
    const [tab, setTab] = useState<"overview" | "events">("overview");
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentBets, setRecentBets] = useState<RecentBet[]>([]);
    const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
    const [loading, setLoading] = useState(true);

    // Event Management States
    const [events, setEvents] = useState<CustomEvent[]>([]);
    const [newEventQuestion, setNewEventQuestion] = useState("");
    const [newEventRewardType, setNewEventRewardType] = useState<"participation" | "win">("participation");
    const [newEventRewardAmount, setNewEventRewardAmount] = useState(50);
    const [newEventOptions, setNewEventOptions] = useState<string[]>(["", ""]);
    const [savingEvent, setSavingEvent] = useState(false);

    useEffect(() => {
        loadStats();
        loadEvents();

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

    async function loadEvents() {
        const { data, error } = await supabase
            .from("custom_events")
            .select(`
                *,
                options:custom_event_options(*)
            `)
            .order("created_at", { ascending: false });
        if (!error && data) {
            setEvents(data as CustomEvent[]);
        }
    }

    async function handleCreateEvent() {
        if (!newEventQuestion.trim() || newEventOptions.some(o => !o.trim())) {
            alert("Please fill all fields.");
            return;
        }
        setSavingEvent(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        const res = await fetch("/api/events/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify({
                question: newEventQuestion,
                rewardType: newEventRewardType,
                rewardAmount: newEventRewardAmount,
                options: newEventOptions.filter(o => o.trim() !== "")
            })
        });
        if (res.ok) {
            setNewEventQuestion("");
            setNewEventOptions(["", ""]);
            loadEvents();
        } else {
            alert("Failed to create event.");
        }
        setSavingEvent(false);
    }

    async function handleResolveEvent(eventId: string, optionId: string | null) {
        if (!confirm("Are you sure you want to resolve/close this event?")) return;
        const { data: { session } } = await supabase.auth.getSession();
        
        const res = await fetch("/api/events/resolve", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify({ eventId, optionId })
        });
        const data = await res.json();
        if (data.success) {
            alert(`Event closed successfully. ${data.winners || 0} winners rewarded.`);
            loadEvents();
        } else {
            alert(`Failed: ${data.error}`);
        }
    }
    
    async function handleDeleteEvent(eventId: string) {
        if (!confirm("Delete this event entirely?")) return;
        await supabase.from("custom_events").delete().eq("id", eventId);
        loadEvents();
    }

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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="neon-green text-xl mb-1">DASHBOARD</h1>
                    <p className="text-faint text-xs">REAL-TIME PLATFORM OVERVIEW</p>
                </div>
                <button
                    onClick={() => { loadStats(); loadEvents(); }}
                    className="btn-pixel btn-ghost flex items-center gap-2 text-xs px-3 py-2"
                >
                    <RefreshCw size={11} />
                    REFRESH
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b-2 border-border pb-1">
                <button 
                  onClick={() => setTab("overview")}
                  className={`text-sm px-4 py-2 transition-colors ${tab === "overview" ? "text-green-DEFAULT border-b-2 border-green-DEFAULT -mb-[3px]" : "text-faint hover:text-white"}`}
                >
                    OVERVIEW
                </button>
                <button 
                  onClick={() => setTab("events")}
                  className={`text-sm px-4 py-2 transition-colors ${tab === "events" ? "text-green-DEFAULT border-b-2 border-green-DEFAULT -mb-[3px]" : "text-faint hover:text-white"}`}
                >
                    CUSTOM EVENTS
                </button>
            </div>

            {tab === "overview" && (
                <>
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
                </>
            )}

            {tab === "events" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create New Event Form */}
                    <div className="lg:col-span-1">
                        <div className="card p-6 sticky top-24 border-2 border-green-DEFAULT/50 bg-bg relative overflow-hidden" style={{ boxShadow: "0 0 30px rgba(0,255,135,0.1)" }}>
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-DEFAULT opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
                            
                            <h2 className="text-white mb-6 text-sm flex items-center gap-2 border-b-2 border-border pb-3">
                                <Zap size={16} className="text-green-DEFAULT" /> 
                                <span className="tracking-widest font-bold">NEW EVENT</span>
                            </h2>
                            
                            <div className="space-y-5 relative z-10">
                                <div>
                                    <label className="flex items-center gap-1.5 text-faint text-xs mb-2">
                                        <Activity size={12} className="text-pink-DEFAULT" /> QUESTION
                                    </label>
                                    <textarea 
                                        value={newEventQuestion} 
                                        onChange={e => setNewEventQuestion(e.target.value)} 
                                        className="form-input text-sm w-full bg-surface2 border-2 border-border focus:border-green-DEFAULT focus:bg-bg transition-colors resize-none h-20" 
                                        placeholder="E.g. Who will win the 2026 World Cup?" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="flex items-center gap-1.5 text-faint text-xs mb-2">
                                            <TrendingUp size={12} className="text-blue-DEFAULT" /> REWARD TYPE
                                        </label>
                                        <select 
                                            value={newEventRewardType} 
                                            onChange={e => setNewEventRewardType(e.target.value as "participation" | "win")}
                                            className="form-input text-sm w-full bg-surface2 border-2 border-border focus:border-blue-DEFAULT transition-colors py-2"
                                        >
                                            <option value="participation">Participation</option>
                                            <option value="win">Win (Resolved)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1.5 text-faint text-xs mb-2">
                                            <Zap size={12} className="text-yellow-DEFAULT" /> REWARD AMOUNT
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={newEventRewardAmount} 
                                                onChange={e => setNewEventRewardAmount(parseInt(e.target.value))} 
                                                className="form-input text-sm w-full bg-surface2 border-2 border-border focus:border-yellow-DEFAULT transition-colors py-2 pl-3 pr-8" 
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-faint text-xs">💎</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t-2 border-border/50">
                                    <label className="flex items-center gap-1.5 text-faint text-xs mb-3">
                                        <CheckCircle size={12} className="text-green-DEFAULT" /> OPTIONS
                                    </label>
                                    <div className="space-y-2">
                                        {newEventOptions.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2 group">
                                                <input 
                                                    type="text" 
                                                    value={opt} 
                                                    onChange={e => {
                                                        const newOpts = [...newEventOptions];
                                                        newOpts[idx] = e.target.value;
                                                        setNewEventOptions(newOpts);
                                                    }} 
                                                    className="form-input text-sm w-full bg-bg border-2 border-border focus:border-green-DEFAULT transition-colors py-2" 
                                                    placeholder={`Enter option ${idx + 1}`} 
                                                />
                                                {newEventOptions.length > 2 && (
                                                    <button 
                                                        onClick={() => setNewEventOptions(newEventOptions.filter((_, i) => i !== idx))} 
                                                        className="btn-pixel bg-surface2 text-faint hover:bg-pink-dim hover:text-pink-DEFAULT hover:border-pink-DEFAULT px-3 shrink-0 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => setNewEventOptions([...newEventOptions, ""])} 
                                        className="text-green-DEFAULT text-xs hover:text-white transition-colors mt-3 flex items-center gap-1"
                                    >
                                        <Activity size={10} /> ADD ANOTHER OPTION
                                    </button>
                                </div>

                                <button 
                                    onClick={handleCreateEvent}
                                    disabled={savingEvent}
                                    className={`btn-pixel w-full text-sm py-4 mt-6 flex justify-center items-center gap-2 transition-all ${
                                        savingEvent 
                                        ? "bg-surface2 text-faint cursor-not-allowed" 
                                        : "bg-green-dim text-green-DEFAULT border-2 border-green-DEFAULT hover:bg-green-DEFAULT hover:text-bg animate-glow-pulse"
                                    }`}
                                >
                                    {savingEvent ? (
                                        <><RefreshCw size={14} className="animate-spin" /> SAVING...</>
                                    ) : (
                                        <><Zap size={14} /> PUBLISH EVENT</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Active/Closed Events List */}
                    <div className="lg:col-span-2 space-y-4">
                        {events.length === 0 ? (
                            <div className="card p-10 text-center">
                                <p className="text-faint text-sm">NO EVENTS FOUND</p>
                            </div>
                        ) : (
                            events.map(event => (
                                <div key={event.id} className="card p-5 border-l-4" style={{ borderLeftColor: event.status === 'active' ? '#00FF87' : '#555' }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-white text-base font-bold">{event.question}</h3>
                                            <div className="flex gap-2 mt-2">
                                                <span className={`badge ${event.status === 'active' ? 'bg-green-dim text-green-DEFAULT border-green-DEFAULT' : 'bg-surface2 text-faint border-border'}`}>
                                                    {event.status.toUpperCase()}
                                                </span>
                                                <span className="badge bg-yellow-dim text-yellow-DEFAULT border-yellow-DEFAULT">
                                                    {event.reward_amount} AURA
                                                </span>
                                                <span className="badge bg-blue-dim text-blue-DEFAULT border-blue-DEFAULT">
                                                    {event.reward_type.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        {event.status === 'active' && (
                                            <button onClick={() => handleDeleteEvent(event.id)} className="text-pink-DEFAULT hover:opacity-70 p-2"><Trash2 size={16} /></button>
                                        )}
                                    </div>

                                    {/* Options & Resolving */}
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {event.options?.map(opt => (
                                            <div key={opt.id} className={`p-3 relative border-2 ${event.resolved_option_id === opt.id ? 'border-yellow-DEFAULT bg-yellow-dim/20' : 'border-border bg-surface2'}`}>
                                                <p className="text-white text-sm">{opt.option_text}</p>
                                                {event.status === 'active' && event.reward_type === 'win' && (
                                                    <button onClick={() => handleResolveEvent(event.id, opt.id)} className="absolute right-2 top-1/2 -translate-y-1/2 btn-pixel btn-ghost text-xs px-2 py-1 text-yellow-DEFAULT scale-90">
                                                        PICK WINNER
                                                    </button>
                                                )}
                                                {event.resolved_option_id === opt.id && (
                                                    <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-DEFAULT" />
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Close event manually if participation only */}
                                    {event.status === 'active' && event.reward_type === 'participation' && (
                                        <div className="mt-4 pt-3 border-t-2 border-border text-right">
                                            <button onClick={() => handleResolveEvent(event.id, null)} className="btn-pixel bg-surface text-faint hover:text-white px-4 py-2 text-xs">
                                                CLOSE EVENT
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}