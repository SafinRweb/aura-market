"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, Send, Users } from "lucide-react";

export default function AdminNotificationsPage() {
    const [message, setMessage] = useState("");
    const [type, setType] = useState<"bet_won" | "bet_lost" | "match_reminder" | "daily_reward">("match_reminder");
    const [target, setTarget] = useState<"all" | "specific">("all");
    const [username, setUsername] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleSend() {
        if (!message.trim()) {
            setError("Message is required");
            return;
        }
        setSending(true);
        setError(null);
        setResult(null);

        try {
            if (target === "all") {
                // Get all users
                const { data: users } = await supabase
                    .from("users")
                    .select("id");

                if (!users || users.length === 0) {
                    setError("No users found");
                    setSending(false);
                    return;
                }

                // Insert notification for each user
                const notifications = users.map(u => ({
                    user_id: u.id,
                    type,
                    message,
                    aura_change: 0,
                    is_read: false,
                }));

                // Batch insert in chunks of 50
                const chunkSize = 50;
                for (let i = 0; i < notifications.length; i += chunkSize) {
                    const chunk = notifications.slice(i, i + chunkSize);
                    await supabase.from("notifications").insert(chunk);
                }

                setResult(`✅ Sent to ${users.length} users successfully`);
            } else {
                // Send to specific user
                const { data: user } = await supabase
                    .from("users")
                    .select("id")
                    .eq("username", username.toLowerCase())
                    .single();

                if (!user) {
                    setError(`User "${username}" not found`);
                    setSending(false);
                    return;
                }

                await supabase.from("notifications").insert({
                    user_id: user.id,
                    type,
                    message,
                    aura_change: 0,
                    is_read: false,
                });

                setResult(`✅ Sent to ${username} successfully`);
            }

            setMessage("");
            setUsername("");
        } catch {
            setError("Failed to send notification");
        }

        setSending(false);
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="neon-green text-xl mb-1">PUSH NOTIFICATIONS</h1>
                <p className="text-faint text-xs">SEND IN-APP NOTIFICATIONS TO USERS</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Compose */}
                <div className="card p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Bell size={14} className="text-green-DEFAULT" />
                        <h2 className="text-white text-sm">COMPOSE NOTIFICATION</h2>
                    </div>

                    {error && (
                        <div className="bg-pink-dim border-2 border-pink-DEFAULT p-3 mb-4">
                            <p className="text-pink-DEFAULT text-xs">{error}</p>
                        </div>
                    )}
                    {result && (
                        <div className="bg-green-dim border-2 border-green-DEFAULT p-3 mb-4">
                            <p className="text-green-DEFAULT text-xs">{result}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Target */}
                        <div>
                            <label className="block text-faint text-xs mb-2">SEND TO</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTarget("all")}
                                    className={`flex items-center gap-2 px-3 py-2 text-xs border-2 transition-all flex-1 justify-center
                    ${target === "all"
                                            ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                            : "border-border text-faint hover:border-border2"
                                        }`}
                                >
                                    <Users size={11} />
                                    ALL USERS
                                </button>
                                <button
                                    onClick={() => setTarget("specific")}
                                    className={`flex items-center gap-2 px-3 py-2 text-xs border-2 transition-all flex-1 justify-center
                    ${target === "specific"
                                            ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                            : "border-border text-faint hover:border-border2"
                                        }`}
                                >
                                    SPECIFIC USER
                                </button>
                            </div>
                        </div>

                        {/* Username if specific */}
                        {target === "specific" && (
                            <div>
                                <label className="block text-faint text-xs mb-2">USERNAME</label>
                                <input
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="username"
                                    className="pixel-input"
                                />
                            </div>
                        )}

                        {/* Type */}
                        <div>
                            <label className="block text-faint text-xs mb-2">TYPE</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value as "bet_won" | "bet_lost" | "match_reminder" | "daily_reward")}
                                className="pixel-input"
                            >
                                <option value="match_reminder">MATCH REMINDER</option>
                                <option value="daily_reward">DAILY REWARD</option>
                                <option value="bet_won">BET WON</option>
                                <option value="bet_lost">BET LOST</option>
                            </select>
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-faint text-xs mb-2">MESSAGE</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Type your notification message..."
                                rows={4}
                                className="pixel-input resize-none"
                                maxLength={200}
                            />
                            <p className="text-faint text-xs mt-1 text-right">
                                {message.length}/200
                            </p>
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="btn-pixel btn-green w-full flex items-center justify-center gap-2"
                        >
                            <Send size={12} />
                            {sending ? "SENDING..." : `SEND TO ${target === "all" ? "ALL USERS" : username || "USER"} →`}
                        </button>
                    </div>
                </div>

                {/* Tips */}
                <div className="space-y-4">
                    <div className="card p-4">
                        <h3 className="text-white text-sm mb-3">NOTIFICATION TYPES</h3>
                        <div className="space-y-3">
                            {[
                                { type: "MATCH REMINDER", color: "text-blue-DEFAULT", desc: "Use before upcoming matches" },
                                { type: "DAILY REWARD", color: "text-yellow-DEFAULT", desc: "Announce special bonus days" },
                                { type: "BET WON", color: "text-green-DEFAULT", desc: "Manual win announcements" },
                                { type: "BET LOST", color: "text-pink-DEFAULT", desc: "Manual loss notifications" },
                            ].map(t => (
                                <div key={t.type} className="flex items-start gap-3">
                                    <span className={`badge ${t.color} border-current flex-shrink-0 mt-0.5`}>
                                        {t.type}
                                    </span>
                                    <p className="text-faint text-xs">{t.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-yellow-dim border-2 border-yellow-DEFAULT p-4">
                        <p className="text-yellow-DEFAULT text-xs mb-2">⚠ WARNING</p>
                        <p className="text-faint text-xs leading-loose">
                            SENDING TO ALL USERS CANNOT BE UNDONE.
                            DOUBLE CHECK YOUR MESSAGE BEFORE SENDING.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}