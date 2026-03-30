"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { streakReward } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import AuraCoin, { AuraAmount } from "@/components/ui/AuraCoin";

interface Props {
  userId: string;
  onClose: () => void;
  onClaim: (amount: number) => void;
}

export default function DailyStreakModal({ userId, onClose, onClaim }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [reward, setReward] = useState(0);

  async function handleClaim() {
    setClaiming(true);
    const today = new Date().toISOString().split("T")[0];

    // Get current streak
    const { data: streak } = await supabase
      .from("daily_streaks")
      .select("*")
      .eq("user_id", userId)
      .single();

    const currentStreak = streak?.current_streak || 0;
    const newStreak = currentStreak + 1;
    const amount = streakReward(newStreak);

    // Update streak
    await supabase
      .from("daily_streaks")
      .upsert({
        user_id: userId,
        last_claimed: today,
        current_streak: newStreak,
        total_claimed: (streak?.total_claimed || 0) + amount,
      });

    // Add aura to balance
    const { error: rpcError } = await supabase.rpc("increment_balance", {
      user_id: userId,
      amount: amount,
    });

    if (rpcError) {
      // Fallback if RPC not set up yet
      const { data } = await supabase.from("users")
        .select("aura_balance")
        .eq("id", userId)
        .single();

      if (data) {
        await supabase.from("users")
          .update({ aura_balance: data.aura_balance + amount, streak: newStreak })
          .eq("id", userId);
      }
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "daily_reward",
      message: `Day ${newStreak} login streak! You earned ${amount} Aura`,
      aura_change: amount,
    });

    analytics.dailyClaimed(newStreak, amount);
    setReward(amount);
    setClaimed(true);
    onClaim(amount);
    setClaiming(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="card w-full max-w-sm p-8 text-center"
        style={{ boxShadow: "0 0 40px rgba(0,255,135,0.2)", border: "2px solid #00ff87" }}>

        {!claimed ? (
          <>
            <p className="text-faint text-xs mb-4">DAILY LOGIN REWARD</p>
            <div className="text-6xl mb-4">🔥</div>
            <h2 className="text-xl text-green-DEFAULT mb-2">YOU&apos;RE BACK!</h2>
            <p className="text-muted text-xs mb-6">CLAIM YOUR DAILY AURA REWARD</p>

            <div className="bg-green-dim border-2 border-green-DEFAULT p-4 mb-6">
              <p className="text-faint text-xs mb-1">TODAY&apos;S REWARD</p>
              <p className="text-green-DEFAULT text-2xl"><AuraAmount prefix="+" amount={10} size={32} /></p>
              <p className="text-faint text-xs mt-1">(SCALES WITH STREAK)</p>
            </div>

            <button
              onClick={handleClaim}
              disabled={claiming}
              className="btn-pixel btn-green w-full"
            >
              {claiming ? "CLAIMING..." : "CLAIM REWARD →"}
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 flex justify-center"><AuraCoin size={80} /></div>
            <h2 className="text-xl text-green-DEFAULT mb-2">CLAIMED!</h2>
            <p className="text-muted text-xs mb-6">ADDED TO YOUR BALANCE</p>
            <div className="bg-green-dim border-2 border-green-DEFAULT p-4 mb-6">
              <p className="text-green-DEFAULT text-2xl"><AuraAmount prefix="+" amount={reward} size={32} /></p>
            </div>
            <button onClick={onClose} className="btn-pixel btn-ghost w-full">
              LET&apos;S BET →
            </button>
          </>
        )}
      </div>
    </div>
  );
}