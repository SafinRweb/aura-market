"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";
import { formatAura, timeAgo } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Gift, Copy, Check, Users, TrendingUp } from "lucide-react";
import { User } from "@/types";
import { AuraAmount } from "@/components/ui/AuraPoints";

interface Referral {
    id: string;
    referred_id: string;
    first_bet_bonus_paid: boolean;
    total_commission: number;
    created_at: string;
    users: { username: string; avatar_url: string | null; total_bets: number };
}

export default function ReferralsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function load() {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { router.push("/auth/login"); return; }

            const [userRes, referralsRes] = await Promise.all([
                supabase.from("users").select("*").eq("id", authUser.id).single(),
                supabase.from("referrals")
                    .select("*, users!referred_id(username, avatar_url, total_bets)")
                    .eq("referrer_id", authUser.id)
                    .order("created_at", { ascending: false }),
            ]);

            setUser(userRes.data);
            setReferrals((referralsRes.data as Referral[]) || []);
            setLoading(false);
        }
        load();
    }, [router]);

    function getReferralLink() {
        return `${window.location.origin}/join?ref=${user?.referral_code}`;
    }

    async function handleCopy() {
        await navigator.clipboard.writeText(getReferralLink());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const activeReferrals = referrals.filter(r => r.users?.total_bets > 0).length;

    if (loading) return (
        <AppLayout>
            <div className="flex items-center justify-center min-h-screen">
                <p className="neon-green text-sm animate-pulse">LOADING...</p>
            </div>
        </AppLayout>
    );

    return (
        <AppLayout>
            <div className="max-w-3xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="flex items-start sm:items-center gap-3 mb-6 sm:mb-8 animate-slide-up">
                    <div className="w-10 h-10 flex-shrink-0 border-2 border-green-DEFAULT bg-green-dim flex items-center justify-center mt-1 sm:mt-0">
                        <Gift size={18} className="text-green-DEFAULT" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="neon-green text-xl sm:text-2xl">REFERRALS</h1>
                        <p className="text-faint text-[11px] sm:text-xs flex flex-wrap items-center mt-1 sm:mt-1.5 gap-x-1 leading-relaxed">
                            EARN <AuraAmount amount={50} size={14} className="shrink-0" /> PER REFERRAL + 10% OF THEIR WINNINGS FOREVER
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8 stagger">
                    <div className="card p-3 sm:p-4 border-2 border-green-DEFAULT bg-green-dim col-span-2 sm:col-span-1">
                        <p className="text-green-DEFAULT text-[10px] sm:text-xs mb-1 sm:mb-2">TOTAL EARNED</p>
                        <p className="neon-green text-lg sm:text-xl"><AuraAmount amount={user?.referral_earnings || 0} size={22} /></p>
                    </div>
                    <div className="card p-3 sm:p-4 border-2 border-blue-DEFAULT bg-blue-dim">
                        <p className="text-blue-DEFAULT text-[10px] sm:text-xs mb-1 sm:mb-2">INVITES</p>
                        <p className="text-white text-lg sm:text-xl">{referrals.length}</p>
                    </div>
                    <div className="card p-3 sm:p-4 border-2 border-yellow-DEFAULT bg-yellow-dim">
                        <p className="text-yellow-DEFAULT text-[10px] sm:text-xs mb-1 sm:mb-2">ACTIVE</p>
                        <p className="text-white text-lg sm:text-xl">{activeReferrals}</p>
                    </div>
                </div>

                {/* Referral link */}
                <div className="card p-5 mb-8 animate-slide-up">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={14} className="text-green-DEFAULT" />
                        <h2 className="text-white text-sm">YOUR REFERRAL LINK</h2>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 bg-bg2 border-2 border-border p-3 overflow-hidden">
                            <p className="text-green-DEFAULT text-xs truncate">
                                {user?.referral_code
                                    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?ref=${user.referral_code}`
                                    : "Loading..."}
                            </p>
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`btn-pixel flex items-center gap-2 text-xs px-4 py-2 flex-shrink-0
                ${copied ? "btn-green" : "btn-ghost"}`}
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? "COPIED!" : "COPY"}
                        </button>
                    </div>

                    {/* How it works */}
                    <div className="mt-6 pt-5 border-t-2 border-border">
                        <p className="text-faint text-xs mb-4">HOW IT WORKS</p>
                        <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3">
                            {[
                                { step: "1", text: "Share your link" },
                                { step: "2", text: "Friend signs up & gets 50 AURA bonus" },
                                { step: "3", text: "You earn 50 AURA + 10% of their wins forever" },
                            ].map(s => (
                                <div key={s.step} className="flex sm:block items-center gap-3 sm:gap-0 sm:text-center bg-surface2 sm:bg-transparent p-3 sm:p-0">
                                    <div className="w-8 h-8 flex-shrink-0 border-2 border-green-DEFAULT bg-green-dim flex items-center justify-center sm:mx-auto sm:mb-3">
                                        <span className="text-green-DEFAULT text-sm">{s.step}</span>
                                    </div>
                                    <p className="text-white sm:text-faint text-[11px] sm:text-xs leading-relaxed text-left sm:text-center w-full">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Referrals list */}
                <div className="card overflow-hidden animate-slide-up">
                    <div className="p-4 border-b-2 border-border bg-surface2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users size={13} className="text-green-DEFAULT" />
                            <h2 className="text-white text-sm">YOUR REFERRALS</h2>
                        </div>
                        <span className="text-faint text-xs">{referrals.length} TOTAL</span>
                    </div>

                    {referrals.length === 0 ? (
                        <div className="p-12 text-center">
                            <Gift size={32} className="text-faint mx-auto mb-4" />
                            <p className="text-faint text-sm mb-2">NO REFERRALS YET</p>
                            <p className="text-faint text-xs leading-loose">
                                SHARE YOUR LINK AND START EARNING
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-border">
                            {referrals.map(ref => (
                                <div key={ref.id} className="p-4 hover:bg-surface2 transition-colors">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-9 h-9 border-2 border-border overflow-hidden flex-shrink-0">
                                            {ref.users?.avatar_url ? (
                                                <img src={ref.users.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-surface2 flex items-center justify-center">
                                                    <span className="text-faint text-xs">
                                                        {ref.users?.username?.slice(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm mb-1">
                                                {ref.users?.username?.toUpperCase()}
                                            </p>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-faint text-xs">
                                                    {ref.users?.total_bets || 0} BETS PLACED
                                                </span>
                                                <span className="text-faint text-xs">·</span>
                                                <span className="text-faint text-xs">
                                                    JOINED {timeAgo(ref.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Earnings from this referral */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-green-DEFAULT text-sm">
                                                +{formatAura(ref.total_commission)}
                                            </p>
                                            <div className="flex items-center gap-1 justify-end mt-1">
                                                {ref.first_bet_bonus_paid ? (
                                                    <span className="badge text-green-DEFAULT border-green-DEFAULT bg-green-dim">
                                                        BONUS PAID
                                                    </span>
                                                ) : (
                                                    <span className="badge text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim">
                                                        AWAITING BET
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer note */}
                <div className="mt-6 border-2 border-border p-4 animate-slide-up">
                    <p className="text-faint text-xs leading-loose">
                        💡 COMMISSIONS ARE PAID AUTOMATICALLY WHEN YOUR REFERRALS WIN BETS.
                        10% OF THEIR PROFIT GOES TO YOUR BALANCE INSTANTLY.
                        THIS LASTS FOREVER — NO EXPIRY.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}