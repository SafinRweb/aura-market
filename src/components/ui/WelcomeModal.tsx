"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import AuraPoints, { AuraAmount } from "@/components/ui/AuraPoints";
import { ArrowRight, Zap, Target, Trophy } from "lucide-react";

interface Props {
  userId: string;
  onClaimed: () => void;
}

const PERKS = [
  { icon: <Zap size={14} className="text-yellow-DEFAULT" />, label: "PREDICT MATCH OUTCOMES" },
  { icon: <Target size={14} className="text-pink-DEFAULT" />, label: "CLIMB THE LEADERBOARD" },
  { icon: <Trophy size={14} className="text-yellow-DEFAULT" />, label: "EARN DAILY STREAK REWARDS" },
];

export default function WelcomeModal({ userId, onClaimed }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleClaim() {
    setClaiming(true);

    // Grant 100 Aura starting balance
    await supabase
      .from("users")
      .update({ aura_balance: 100 })
      .eq("id", userId);

    // Initialize daily_streaks row with streak=0 so tomorrow they get Day 1
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("daily_streaks")
      .upsert({
        user_id: userId,
        last_claimed: today,
        current_streak: 0,
        total_claimed: 0,
      });

    // Create welcome notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "daily_reward",
      message: "Welcome to Aura Market! Your 100 Aura starting bonus has been claimed.",
      aura_change: 100,
    });

    setClaimed(true);
    setClaiming(false);
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      <div
        className="card w-full max-w-sm overflow-hidden animate-slide-up"
        style={{ boxShadow: "0 0 60px rgba(0,255,135,0.25)", border: "2px solid #00ff87" }}
      >
        {/* Glowing header */}
        <div
          className="relative p-6 text-center overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(0,255,135,0.15) 0%, transparent 70%)",
            borderBottom: "2px solid rgba(0,255,135,0.2)",
          }}
        >
          {/* Animated point */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{ background: "radial-gradient(circle, rgba(0,255,135,0.4) 0%, transparent 70%)", transform: "scale(2)" }}
              />
              <AuraPoints size={64} />
            </div>
          </div>
          <p className="text-faint text-xs mb-1 tracking-widest">WELCOME TO</p>
          <h1 className="text-2xl text-green-DEFAULT" style={{ textShadow: "0 0 20px rgba(0,255,135,0.8)" }}>
            AURA MARKET
          </h1>
          <p className="text-muted text-xs mt-2">YOUR PREDICTION JOURNEY STARTS NOW</p>
        </div>

        <div className="p-6">
          {!claimed ? (
            <>
              {/* Perks list */}
              <div className="space-y-3 mb-6">
                {PERKS.map((perk, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-surface2 border border-border flex items-center justify-center flex-shrink-0">
                      {perk.icon}
                    </div>
                    <p className="text-faint text-xs">{perk.label}</p>
                  </div>
                ))}
              </div>

              {/* Reward box */}
              <div
                className="p-4 mb-5 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(0,255,135,0.08) 0%, rgba(0,255,135,0.03) 100%)",
                  border: "2px solid rgba(0,255,135,0.4)",
                  boxShadow: "inset 0 0 20px rgba(0,255,135,0.05)",
                }}
              >
                <p className="text-faint text-xs mb-2">YOUR STARTING BONUS</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-green-DEFAULT text-3xl" style={{ textShadow: "0 0 15px rgba(0,255,135,0.6)" }}>
                    <AuraAmount amount={100} size={36} />
                  </p>
                </div>
                <p className="text-faint text-xs mt-2">FREE · NO DEPOSIT REQUIRED</p>
              </div>

              <button
                onClick={handleClaim}
                disabled={claiming}
                className="btn-pixel btn-green w-full flex items-center justify-center gap-2"
                style={{ boxShadow: "0 0 20px rgba(0,255,135,0.3)" }}
              >
                {claiming ? "CLAIMING..." : (
                  <span className="flex items-center justify-center gap-2">
                    CLAIM 100 AURA <ArrowRight size={14} className="-mt-[2px]" />
                  </span>
                )}
              </button>

              <p className="text-faint text-xs text-center mt-3">
                COME BACK DAILY FOR STREAK BONUSES 🔥
              </p>
            </>
          ) : (
            // Success state
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl text-green-DEFAULT mb-2" style={{ textShadow: "0 0 15px rgba(0,255,135,0.5)" }}>
                AURA LOADED!
              </h2>
              <p className="text-muted text-xs mb-6">100 AURA ADDED TO YOUR ACCOUNT</p>
              <div
                className="p-4 mb-6 text-center"
                style={{ background: "rgba(0,255,135,0.08)", border: "2px solid rgba(0,255,135,0.3)" }}
              >
                <p className="text-faint text-xs mb-1">TIP</p>
                <p className="text-muted text-xs leading-relaxed">
                  LOGIN DAILY TO BUILD YOUR STREAK AND EARN UP TO 100 AURA PER DAY!
                </p>
              </div>
              <button
                onClick={onClaimed}
                className="btn-pixel btn-green w-full flex items-center justify-center gap-2"
              >
                START PREDICTING <ArrowRight size={14} className="-mt-[2px]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
