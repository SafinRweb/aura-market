"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Notification as AppNotification, User } from "@/types";
import AppLayout from "@/components/layout/AppLayout";
import { timeAgo, formatAura } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    Bell, Trophy, XCircle, Gift,
    Clock, CheckCheck, ToggleLeft, ToggleRight
} from "lucide-react";
import { requestNotificationPermission } from "@/lib/firebase";

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [togglingPush, setTogglingPush] = useState(false);

    useEffect(() => {
        async function load() {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { router.push("/auth/login"); return; }

            const [userRes, notifRes] = await Promise.all([
                supabase.from("users").select("*").eq("id", authUser.id).single(),
                supabase.from("notifications")
                    .select("*")
                    .eq("user_id", authUser.id)
                    .order("created_at", { ascending: false })
                    .limit(50),
            ]);

            setUser(userRes.data);
            setPushEnabled(userRes.data?.push_enabled || false);
            setNotifications(notifRes.data || []);

            // Mark all as read
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", authUser.id)
                .eq("is_read", false);

            setLoading(false);
        }
        load();

        // Realtime notifications
        const channel = supabase
            .channel("notifications")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "notifications",
            }, (payload) => {
                setNotifications(prev => [payload.new as AppNotification, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [router]);

    async function handleTogglePush() {
        if (!user) return;
        setTogglingPush(true);

        if (!pushEnabled) {
            // Check if notifications are supported
            if (!("Notification" in window)) {
                alert("Push notifications are not supported in this browser");
                setTogglingPush(false);
                return;
            }

            // Check if already denied
            if (Notification.permission === "denied") {
                alert(
                    "Notifications are blocked for this site.\n\n" +
                    "To fix this:\n" +
                    "1. Open Chrome Settings\n" +
                    "2. Go to Site Settings → Notifications\n" +
                    "3. Find aura-market-football.vercel.app\n" +
                    "4. Set to Allow\n" +
                    "5. Come back and try again"
                );
                setTogglingPush(false);
                return;
            }

            const token = await requestNotificationPermission();

            if (!token) {
                alert("Failed to register push token. Make sure notifications are allowed and try clearing site data.");
                setTogglingPush(false);
                return;
            }

            await supabase
                .from("users")
                .update({ push_enabled: true, fcm_token: token })
                .eq("id", user.id);
            setPushEnabled(true);

        } else {
            await supabase
                .from("users")
                .update({ push_enabled: false, fcm_token: null })
                .eq("id", user.id);
            setPushEnabled(false);
        }

        setTogglingPush(false);
    }

    async function markAllRead() {
        if (!user) return;
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }

    function getIcon(type: AppNotification["type"]) {
        switch (type) {
            case "bet_won": return <Trophy size={14} className="text-green-DEFAULT" />;
            case "bet_lost": return <XCircle size={14} className="text-pink-DEFAULT" />;
            case "bet_void": return <XCircle size={14} className="text-faint" />;
            case "daily_reward": return <Gift size={14} className="text-yellow-DEFAULT" />;
            case "match_reminder": return <Clock size={14} className="text-blue-DEFAULT" />;
            default: return <Bell size={14} className="text-faint" />;
        }
    }

    function getAccentColor(type: AppNotification["type"]) {
        switch (type) {
            case "bet_won": return "border-l-green-DEFAULT bg-green-dim";
            case "bet_lost": return "border-l-pink-DEFAULT bg-pink-dim";
            case "bet_void": return "border-l-border bg-surface";
            case "daily_reward": return "border-l-yellow-DEFAULT bg-yellow-dim";
            case "match_reminder": return "border-l-blue-DEFAULT bg-blue-dim";
            default: return "border-l-border bg-surface";
        }
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) return (
        <AppLayout>
            <div className="flex items-center justify-center min-h-screen">
                <p className="neon-green text-sm animate-pulse">LOADING...</p>
            </div>
        </AppLayout>
    );

    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-slide-up">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Bell size={16} className="text-green-DEFAULT" />
                            <h1 className="neon-green text-xl">NOTIFICATIONS</h1>
                        </div>
                        <p className="text-faint text-xs">
                            {unreadCount > 0
                                ? `${unreadCount} UNREAD`
                                : "ALL CAUGHT UP"}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-2 btn-pixel btn-ghost text-xs px-3 py-2"
                        >
                            <CheckCheck size={12} />
                            MARK ALL READ
                        </button>
                    )}
                </div>

                {/* Push notification toggle */}
                <div className="card p-5 mb-6 animate-slide-up">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white text-sm mb-1">MATCH REMINDERS</p>
                            <p className="text-faint text-xs leading-relaxed">
                                GET PUSH NOTIFICATIONS 30 MINS BEFORE KICKOFF
                            </p>
                        </div>
                        <button
                            onClick={handleTogglePush}
                            disabled={togglingPush}
                            className="flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {pushEnabled ? (
                                <>
                                    <span className="text-green-DEFAULT text-xs">ON</span>
                                    <ToggleRight size={28} className="text-green-DEFAULT" />
                                </>
                            ) : (
                                <>
                                    <span className="text-faint text-xs">OFF</span>
                                    <ToggleLeft size={28} className="text-faint" />
                                </>
                            )}
                        </button>
                    </div>

                    {pushEnabled && (
                        <div className="mt-4 pt-4 border-t-2 border-border flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-DEFAULT animate-pulse" />
                            <p className="text-green-DEFAULT text-xs">
                                PUSH NOTIFICATIONS ACTIVE
                            </p>
                        </div>
                    )}
                </div>

                {/* Notifications list */}
                <div className="card overflow-hidden animate-slide-up">
                    <div className="p-4 border-b-2 border-border bg-surface2 flex items-center justify-between">
                        <h2 className="text-white text-sm">ACTIVITY</h2>
                        <span className="text-faint text-xs">{notifications.length} TOTAL</span>
                    </div>

                    {notifications.length === 0 ? (
                        <div className="p-16 text-center">
                            <Bell size={32} className="text-faint mx-auto mb-4" />
                            <p className="text-faint text-sm">NO NOTIFICATIONS YET</p>
                            <p className="text-faint text-xs mt-2">
                                BET ON MATCHES TO GET UPDATES
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-border">
                            {notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`flex items-start gap-4 p-4 border-l-4 transition-colors
                    hover:brightness-110 animate-fade-in
                    ${getAccentColor(notif.type)}
                    ${!notif.is_read ? "opacity-100" : "opacity-70"}
                  `}
                                >
                                    {/* Icon */}
                                    <div className="flex-shrink-0 mt-0.5 p-2 bg-surface border-2 border-border">
                                        {getIcon(notif.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm leading-relaxed mb-1">
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <p className="text-faint text-xs">{timeAgo(notif.created_at)}</p>
                                            {notif.aura_change !== 0 && (
                                                <span className={`text-xs font-bold ${notif.aura_change > 0
                                                        ? "text-green-DEFAULT"
                                                        : "text-pink-DEFAULT"
                                                    }`}>
                                                    {notif.aura_change > 0 ? "+" : ""}
                                                    {formatAura(notif.aura_change)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Unread dot */}
                                    {!notif.is_read && (
                                        <div className="w-2 h-2 bg-green-DEFAULT flex-shrink-0 mt-2 animate-pulse" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info box */}
                <div className="mt-6 border-2 border-border p-4 animate-slide-up">
                    <p className="text-faint text-xs leading-loose">
                        💡 BET RESULTS ARE AUTOMATICALLY CALCULATED AFTER EACH MATCH ENDS.
                        WINNINGS ARE INSTANTLY ADDED TO YOUR BALANCE.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}