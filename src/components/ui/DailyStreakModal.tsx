"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { streakReward, STREAK_ROADMAP } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import AuraPoints, { AuraAmount } from "@/components/ui/AuraPoints";
import { ArrowRight, CheckCircle, Lock, Flame, Trophy } from "lucide-react";

interface Props {
  userId: string;
  currentStreak: number; // streak BEFORE today's claim (e.g. 2 means they've done 2 days, today is day 3)
  onClose: () => void;
  onClaim: (amount: number) => void;
}

export default function DailyStreakModal({ userId, currentStreak, onClose, onClaim }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [reward, setReward] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Today is day currentStreak + 1 in the cycle
  const todayStreak = currentStreak + 1;
  // Position inside the 7-day cycle (1–7)
  const cycleDay = ((todayStreak - 1) % 7) + 1;
  const todayReward = streakReward(todayStreak);

  async function handleClaim() {
    setClaiming(true);
    const today = new Date().toISOString().split("T")[0];
    const newStreak = todayStreak;
    const amount = todayReward;

    // Update streak record
    await supabase
      .from("daily_streaks")
      .upsert({
        user_id: userId,
        last_claimed: today,
        current_streak: newStreak,
        total_claimed: 0, // we don't track this strictly but keep schema valid
      });

    // Credit balance
    const { data: userData } = await supabase
      .from("users")
      .select("aura_balance, streak")
      .eq("id", userId)
      .single();

    if (userData) {
      await supabase
        .from("users")
        .update({
          aura_balance: userData.aura_balance + amount,
          streak: newStreak,
        })
        .eq("id", userId);
    }

    // Notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "daily_reward",
      message: `Day ${newStreak} streak! You earned ${amount} Aura`,
      aura_change: amount,
    });

    analytics.dailyClaimed(newStreak, amount);
    setReward(amount);
    setClaimed(true);
    onClaim(amount);
    setClaiming(false);
  }

  function getDayState(day: number): "past" | "today" | "future" {
    if (day < cycleDay) return "past";
    if (day === cycleDay) return "today";
    return "future";
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)" }}
    >
      <div
        className="card w-full max-w-sm overflow-hidden animate-slide-up"
        style={{ boxShadow: "0 0 50px rgba(255,180,0,0.15)", border: "2px solid rgba(255,180,0,0.4)" }}
      >
        {/* Header */}
        <div
          className="relative p-5 text-center overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(255,180,0,0.12) 0%, transparent 70%)",
            borderBottom: "2px solid rgba(255,180,0,0.2)",
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame size={20} className="text-pink-DEFAULT" />
            <p className="text-yellow-DEFAULT text-sm tracking-widest">DAILY LOGIN BONUS</p>
            <Flame size={20} className="text-pink-DEFAULT" />
          </div>
          <p className="text-faint text-xs">
            {currentStreak > 0
              ? `${currentStreak} DAY STREAK — KEEP IT GOING!`
              : "FIRST DAY — START YOUR STREAK!"}
          </p>
        </div>

        <div className="p-5">
          {!claimed ? (
            <>
              {/* Streak Roadmap Grid */}
              <p className="text-faint text-xs mb-3 text-center">THIS WEEK&apos;S REWARDS</p>
              <div className="grid grid-cols-7 gap-1 mb-5">
                {STREAK_ROADMAP.map(({ day, reward: dayReward }) => {
                  const state = getDayState(day);
                  return (
                    <div
                      key={day}
                      className="flex flex-col items-center gap-1"
                    >
                      {/* Day label */}
                      <p className="text-faint text-xs" style={{ fontSize: "8px" }}>D{day}</p>

                      {/* Tile */}
                      <div
                        className="w-full aspect-square flex flex-col items-center justify-center gap-0.5 relative"
                        style={{
                          border: state === "today"
                            ? "2px solid #FFBE0B"
                            : state === "past"
                              ? "2px solid rgba(0,255,135,0.5)"
                              : "2px solid rgba(255,255,255,0.1)",
                          background: state === "today"
                            ? "rgba(255,190,11,0.15)"
                            : state === "past"
                              ? "rgba(0,255,135,0.07)"
                              : "rgba(255,255,255,0.02)",
                          boxShadow: state === "today"
                            ? "0 0 12px rgba(255,190,11,0.4)"
                            : "none",
                        }}
                      >
                        {state === "past" ? (
                          <CheckCircle size={10} className="text-green-DEFAULT" />
                        ) : state === "today" ? (
                          <AuraPoints size={14} />
                        ) : (
                          <Lock size={8} className="text-faint" />
                        )}
                      </div>

                      {/* Reward amount */}
                      <p
                        className="text-center"
                        style={{
                          fontSize: "7px",
                          color: state === "today"
                            ? "#FFBE0B"
                            : state === "past"
                              ? "rgba(0,255,135,0.7)"
                              : "rgba(255,255,255,0.25)",
                        }}
                      >
                        {dayReward}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Day 7 milestone callout */}
              <div
                className="flex items-center gap-3 p-3 mb-5"
                style={{ background: "rgba(255,190,11,0.06)", border: "1px solid rgba(255,190,11,0.2)" }}
              >
                <Trophy size={16} className="text-yellow-DEFAULT flex-shrink-0" />
                <div>
                  <p className="text-yellow-DEFAULT text-xs">7-DAY MILESTONE</p>
                  <p className="text-faint text-xs">Log in 7 days in a row for a 100 Aura mega-bonus!</p>
                </div>
              </div>

              {/* Today's reward highlight */}
              <div
                className="p-4 mb-5 text-center"
                style={{
                  background: "rgba(255,190,11,0.08)",
                  border: "2px solid rgba(255,190,11,0.4)",
                  boxShadow: "0 0 20px rgba(255,190,11,0.1)",
                }}
              >
                <p className="text-faint text-xs mb-1">TODAY&apos;S CLAIM · DAY {cycleDay}</p>
                <AuraAmount amount={todayReward} size={28} />
              </div>

              <button
                onClick={handleClaim}
                disabled={claiming}
                className="btn-pixel btn-green w-full flex items-center justify-center gap-2"
              >
                {claiming ? "CLAIMING..." : (
                  <span className="flex items-center gap-2">
                    CLAIM {todayReward} AURA <ArrowRight size={14} className="-mt-[2px]" />
                  </span>
                )}
              </button>
            </>
          ) : (
            // Claimed success state
            <div className="text-center py-2">
              <div className="text-5xl mb-3">🔥</div>
              <h2 className="text-xl text-yellow-DEFAULT mb-1">STREAK DAY {todayStreak}!</h2>
              <div
                className="p-4 my-4"
                style={{ background: "rgba(0,255,135,0.08)", border: "2px solid rgba(0,255,135,0.3)" }}
              >
                <p className="text-faint text-xs mb-1">AURA ADDED</p>
                <AuraAmount amount={reward} size={32} />
              </div>
              {cycleDay < 7 && (
                <p className="text-faint text-xs mb-4">
                  {7 - cycleDay} MORE DAY{7 - cycleDay !== 1 ? "S" : ""} UNTIL THE 100 AURA MEGA BONUS!
                </p>
              )}
              <button onClick={onClose} className="btn-pixel btn-ghost w-full flex items-center justify-center gap-2">
                LET&apos;S PREDICT <ArrowRight size={14} className="-mt-[2px]" />
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