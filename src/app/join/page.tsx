"use client";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift, Zap } from "lucide-react";
import Link from "next/link";

function JoinContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const refCode = searchParams.get("ref");

    const [referrer, setReferrer] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            // Check if already logged in
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push("/dashboard");
                return;
            }

            // Look up referrer
            if (refCode) {
                const { data } = await supabase
                    .from("users")
                    .select("username")
                    .eq("referral_code", refCode)
                    .single();

                if (data) {
                    setReferrer(data.username);
                    // Store ref code in localStorage so signup page can pick it up
                    localStorage.setItem("ref_code", refCode);
                }
            }

            setLoading(false);
        }
        load();
    }, [refCode, router]);

    if (loading) return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <p className="neon-green text-sm animate-pulse">LOADING...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-10">
                    <h1 className="neon-green text-2xl mb-2">AURA MARKET</h1>
                    <p className="text-faint text-xs">2026 WORLD CUP PREDICTION MARKET</p>
                </div>

                {/* Referral banner */}
                {referrer ? (
                    <div className="bg-green-dim border-2 border-green-DEFAULT p-5 mb-6 text-center animate-slide-up"
                        style={{ boxShadow: "0 0 30px rgba(0,255,135,0.2)" }}>
                        <Gift size={24} className="text-green-DEFAULT mx-auto mb-3" />
                        <p className="text-green-DEFAULT text-sm mb-2">
                            {referrer.toUpperCase()} INVITED YOU!
                        </p>
                        <p className="text-faint text-xs leading-loose">
                            SIGN UP NOW AND GET
                        </p>
                        <p className="neon-green text-xl my-2">+50 🤫 FREE</p>
                        <p className="text-faint text-xs">ADDED TO YOUR STARTING BALANCE</p>
                    </div>
                ) : (
                    <div className="bg-green-dim border-2 border-green-DEFAULT p-4 mb-6 text-center">
                        <p className="text-green-DEFAULT text-xs">
                            🤫 JOIN FREE — GET 100 AURA ON SIGNUP
                        </p>
                    </div>
                )}

                {/* Perks */}
                <div className="card p-5 mb-6">
                    <h2 className="text-white text-sm mb-4">WHAT YOU GET</h2>
                    <div className="space-y-3">
                        {[
                            {
                                icon: "🤫",
                                title: referrer ? "150 AURA ON SIGNUP" : "100 AURA ON SIGNUP",
                                desc: referrer ? "100 base + 50 referral bonus" : "Free starting balance",
                            },
                            {
                                icon: "⚽",
                                title: "BET ON 104 MATCHES",
                                desc: "4 markets per match",
                            },
                            {
                                icon: "🏆",
                                title: "GLOBAL LEADERBOARD",
                                desc: "Compete against everyone",
                            },
                            {
                                icon: "🔥",
                                title: "DAILY STREAK REWARDS",
                                desc: "Login every day for bonus Aura",
                            },
                        ].map((perk, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <span className="text-xl flex-shrink-0">{perk.icon}</span>
                                <div>
                                    <p className="text-white text-xs mb-0.5">{perk.title}</p>
                                    <p className="text-faint text-xs">{perk.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA buttons */}
                <div className="space-y-3">
                    <Link
                        href="/auth/signup"
                        className="btn-pixel btn-green w-full flex items-center justify-center gap-2 text-sm py-4"
                    >
                        <Zap size={14} />
                        {referrer ? "CLAIM YOUR 150 🤫 AND JOIN →" : "JOIN FREE — GET 100 🤫 →"}
                    </Link>
                    <Link
                        href="/auth/login"
                        className="btn-pixel btn-ghost w-full flex items-center justify-center gap-2 text-sm py-3"
                    >
                        ALREADY HAVE AN ACCOUNT? LOGIN
                    </Link>
                </div>

                <p className="text-center text-faint text-xs mt-6">
                    ZERO REAL MONEY · PURELY SOCIAL · AURA IS FICTIONAL
                </p>
            </div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><p className="neon-green text-sm animate-pulse">LOADING...</p></div>}>
            <JoinContent />
        </Suspense>
    );
}