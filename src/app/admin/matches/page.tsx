"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Match } from "@/types";
import { formatKickoff } from "@/lib/utils";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

const EMPTY_MATCH = {
    home_team: "",
    away_team: "",
    home_flag: "",
    away_flag: "",
    kickoff_time: "",
    status: "upcoming" as "upcoming" | "live" | "finished" | "void",
    competition: "FIFA World Cup 2026",
    stage: "group" as "group" | "round_of_32" | "round_of_16" | "quarter" | "semi" | "third_place" | "final",
    group_name: "",
    venue: "",
};

export default function AdminMatchesPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editMatch, setEditMatch] = useState<Match | null>(null);
    const [form, setForm] = useState(EMPTY_MATCH);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { loadMatches(); }, []);

    async function loadMatches() {
        const { data } = await supabase
            .from("matches")
            .select("*")
            .order("kickoff_time", { ascending: true });
        setMatches(data || []);
        setLoading(false);
    }

    function openAdd() {
        setForm(EMPTY_MATCH);
        setEditMatch(null);
        setShowForm(true);
        setError(null);
    }

    function openEdit(match: Match) {
        setForm({
            home_team: match.home_team,
            away_team: match.away_team,
            home_flag: match.home_flag,
            away_flag: match.away_flag,
            kickoff_time: match.kickoff_time.slice(0, 16),
            status: match.status,
            competition: match.competition,
            stage: match.stage,
            group_name: match.group_name || "",
            venue: match.venue,
        });
        setEditMatch(match);
        setShowForm(true);
        setError(null);
    }

    async function handleSave() {
        if (!form.home_team || !form.away_team || !form.kickoff_time) {
            setError("Home team, away team and kickoff time are required");
            return;
        }
        setSaving(true);
        setError(null);

        const matchData = {
            home_team: form.home_team,
            away_team: form.away_team,
            home_flag: form.home_flag || "🏳️",
            away_flag: form.away_flag || "🏳️",
            kickoff_time: new Date(form.kickoff_time).toISOString(),
            status: form.status,
            competition: form.competition,
            stage: form.stage,
            group_name: form.group_name || null,
            venue: form.venue,
        };

        if (editMatch) {
            await supabase.from("matches").update(matchData).eq("id", editMatch.id);
        } else {
            await supabase.from("matches").insert(matchData);
        }

        await loadMatches();
        setShowForm(false);
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this match? All bets will be voided.")) return;
        await supabase.from("matches").delete().eq("id", id);
        await loadMatches();
    }

    async function handleStatusChange(id: string, status: string) {
        await supabase.from("matches").update({ status }).eq("id", id);
        await loadMatches();
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="neon-green text-xl mb-1">MATCHES</h1>
                    <p className="text-faint text-xs">{matches.length} TOTAL</p>
                </div>
                <button onClick={openAdd} className="btn-pixel btn-green flex items-center gap-2 text-xs px-4 py-2">
                    <Plus size={12} />
                    ADD MATCH
                </button>
            </div>

            {/* Add/Edit form */}
            {showForm && (
                <div className="card p-6 mb-6 border-2 border-green-DEFAULT animate-slide-up"
                    style={{ boxShadow: "0 0 20px rgba(0,255,135,0.15)" }}>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-white text-sm">
                            {editMatch ? "EDIT MATCH" : "ADD MATCH"}
                        </h2>
                        <button onClick={() => setShowForm(false)}>
                            <X size={16} className="text-faint hover:text-white" />
                        </button>
                    </div>

                    {error && (
                        <div className="bg-pink-dim border-2 border-pink-DEFAULT p-3 mb-4">
                            <p className="text-pink-DEFAULT text-xs">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-faint text-xs mb-2">HOME TEAM</label>
                            <input
                                value={form.home_team}
                                onChange={e => setForm(p => ({ ...p, home_team: e.target.value }))}
                                placeholder="Brazil"
                                className="pixel-input"
                            />
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">AWAY TEAM</label>
                            <input
                                value={form.away_team}
                                onChange={e => setForm(p => ({ ...p, away_team: e.target.value }))}
                                placeholder="Argentina"
                                className="pixel-input"
                            />
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">HOME FLAG EMOJI</label>
                            <input
                                value={form.home_flag}
                                onChange={e => setForm(p => ({ ...p, home_flag: e.target.value }))}
                                placeholder="🇧🇷"
                                className="pixel-input"
                            />
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">AWAY FLAG EMOJI</label>
                            <input
                                value={form.away_flag}
                                onChange={e => setForm(p => ({ ...p, away_flag: e.target.value }))}
                                placeholder="🇦🇷"
                                className="pixel-input"
                            />
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">KICKOFF TIME</label>
                            <input
                                type="datetime-local"
                                value={form.kickoff_time}
                                onChange={e => setForm(p => ({ ...p, kickoff_time: e.target.value }))}
                                className="pixel-input"
                            />
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">STATUS</label>
                            <select
                                value={form.status}
                                onChange={e => setForm(p => ({ ...p, status: e.target.value as "upcoming" | "live" | "finished" | "void" }))}
                                className="pixel-input"
                            >
                                <option value="upcoming">UPCOMING</option>
                                <option value="live">LIVE</option>
                                <option value="finished">FINISHED</option>
                                <option value="void">VOID</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">GROUP</label>
                            <input
                                value={form.group_name}
                                onChange={e => setForm(p => ({ ...p, group_name: e.target.value }))}
                                placeholder="GROUP A"
                                className="pixel-input"
                            />
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">VENUE</label>
                            <input
                                value={form.venue}
                                onChange={e => setForm(p => ({ ...p, venue: e.target.value }))}
                                placeholder="MetLife Stadium, New York"
                                className="pixel-input"
                            />
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">STAGE</label>
                            <select
                                value={form.stage}
                                onChange={e => setForm(p => ({ ...p, stage: e.target.value as "group" | "round_of_32" | "round_of_16" | "quarter" | "semi" | "third_place" | "final" }))}
                                className="pixel-input"
                            >
                                <option value="group">GROUP</option>
                                <option value="round_of_32">ROUND OF 32</option>
                                <option value="round_of_16">ROUND OF 16</option>
                                <option value="quarter">QUARTER FINAL</option>
                                <option value="semi">SEMI FINAL</option>
                                <option value="third_place">THIRD PLACE</option>
                                <option value="final">FINAL</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">COMPETITION</label>
                            <input
                                value={form.competition}
                                onChange={e => setForm(p => ({ ...p, competition: e.target.value }))}
                                className="pixel-input"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-pixel btn-green flex items-center gap-2 text-xs px-4 py-2"
                        >
                            <Check size={12} />
                            {saving ? "SAVING..." : "SAVE MATCH"}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="btn-pixel btn-ghost text-xs px-4 py-2"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            )}

            {/* Matches table */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b-2 border-border bg-surface2">
                    <h2 className="text-white text-sm">ALL MATCHES</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center">
                        <p className="neon-green text-sm animate-pulse">LOADING...</p>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-faint text-sm">NO MATCHES YET</p>
                    </div>
                ) : (
                    <div className="divide-y-2 divide-border">
                        {matches.map(match => (
                            <div key={match.id} className="p-4 hover:bg-surface2 transition-colors">
                                <div className="flex items-center gap-4 flex-wrap">
                                    {/* Teams */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm mb-1">
                                            {match.home_flag} {match.home_team} vs {match.away_team} {match.away_flag}
                                        </p>
                                        <p className="text-faint text-xs">
                                            {formatKickoff(match.kickoff_time)} · {match.venue}
                                        </p>
                                    </div>

                                    {/* Status selector */}
                                    <select
                                        value={match.status}
                                        onChange={e => handleStatusChange(match.id, e.target.value)}
                                        className={`pixel-input w-32 text-xs ${match.status === "live"
                                                ? "border-pink-DEFAULT text-pink-DEFAULT"
                                                : match.status === "upcoming"
                                                    ? "border-yellow-DEFAULT text-yellow-DEFAULT"
                                                    : match.status === "finished"
                                                        ? "border-faint text-faint"
                                                        : "border-border text-faint"
                                            }`}
                                    >
                                        <option value="upcoming">UPCOMING</option>
                                        <option value="live">LIVE</option>
                                        <option value="finished">FINISHED</option>
                                        <option value="void">VOID</option>
                                    </select>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEdit(match)}
                                            className="p-2 border-2 border-border hover:border-blue-DEFAULT hover:text-blue-DEFAULT text-faint transition-colors"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(match.id)}
                                            className="p-2 border-2 border-border hover:border-pink-DEFAULT hover:text-pink-DEFAULT text-faint transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}