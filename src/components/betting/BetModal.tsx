"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Match, Pool } from "@/types";
import { validateStake, formatAura, calcPayout, marketLabel } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { X, AlertTriangle, ArrowRight } from "lucide-react";
import { MarketType } from "@/types";

interface Props {
  match: Match;
  marketType: MarketType;
  outcome: string;
  outcomeLabel: string;
  pools: Pool[];
  userBalance: number;
  userId: string;
  onClose: () => void;
  onSuccess: (stake: number) => void;
}

export default function BetModal({
  match, marketType, outcome, outcomeLabel,
  pools, userBalance, userId, onClose, onSuccess
}: Props) {
  const [stake, setStake] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate pool totals
  const totalPool = pools
    .filter(p => p.market_type === marketType)
    .reduce((sum, p) => sum + p.total_staked, 0);

  const winningSidePool = pools.find(
    p => p.market_type === marketType && p.outcome === outcome
  )?.total_staked || 0;

  const stakeNum = parseInt(stake) || 0;
  const newWinningSide = winningSidePool + stakeNum;
  const newTotalPool = totalPool + stakeNum;
  const estimatedPayout = calcPayout(stakeNum, newWinningSide, newTotalPool);
  const estimatedOdds = stakeNum > 0 ? (estimatedPayout / stakeNum).toFixed(2) : "0.00";

  function handleStakeChange(val: string) {
    // Strip decimals immediately
    const clean = val.replace(/[^0-9]/g, "");
    setStake(clean);
    setError(null);
  }

  function handleMax() {
    setStake(String(userBalance));
  }

  async function handleConfirm() {
    const stakeInt = parseInt(stake);
    const validationError = validateStake(stakeInt, userBalance);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    // Check for duplicate bet on same market
    const { data: existing } = await supabase
      .from("bets")
      .select("id")
      .eq("user_id", userId)
      .eq("match_id", match.id)
      .eq("market_type", marketType)
      .single();

    if (existing) {
      setError("You already have a bet on this market");
      setLoading(false);
      return;
    }

    // Deduct balance first
    const { error: balanceError } = await supabase
      .from("users")
      .update({ aura_balance: userBalance - stakeInt })
      .eq("id", userId);

    if (balanceError) {
      setError("Failed to place bet. Try again.");
      setLoading(false);
      return;
    }

    // Insert bet
    const { error: betError } = await supabase
      .from("bets")
      .insert({
        user_id: userId,
        match_id: match.id,
        market_type: marketType,
        outcome,
        stake: stakeInt,
        potential_payout: estimatedPayout,
        status: "pending",
      });

    if (betError) {
      // Refund balance if bet insert fails
      await supabase
        .from("users")
        .update({ aura_balance: userBalance })
        .eq("id", userId);
      setError("Failed to place bet. Try again.");
      setLoading(false);
      return;
    }

    // Update pool
    const { data: poolExists } = await supabase
      .from("pools")
      .select("id, total_staked")
      .eq("match_id", match.id)
      .eq("market_type", marketType)
      .eq("outcome", outcome)
      .single();

    if (poolExists) {
      await supabase
        .from("pools")
        .update({ total_staked: poolExists.total_staked + stakeInt })
        .eq("id", poolExists.id);
    } else {
      await supabase
        .from("pools")
        .insert({
          match_id: match.id,
          market_type: marketType,
          outcome,
          total_staked: stakeInt,
        });
    }

    // Update user stats
    await supabase
      .from("users")
      .update({ total_bets: supabase.rpc as unknown as number })
      .eq("id", userId);

    // Simpler stats update
    const { data: userStats } = await supabase
      .from("users")
      .select("total_bets, total_lost")
      .eq("id", userId)
      .single();

    if (userStats) {
      await supabase
        .from("users")
        .update({
          total_bets: userStats.total_bets + 1,
          total_lost: userStats.total_lost + stakeInt,
        })
        .eq("id", userId);
    }

    analytics.betPlaced(marketType, stakeInt);
    onSuccess(stakeInt);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:"rgba(0,0,0,0.9)"}}>
      <div className="card w-full max-w-md border-glow-green animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-border">
          <div>
            <p className="text-faint text-xs mb-1">{marketLabel(marketType)}</p>
            <h2 className="text-white text-sm">{match.home_team} VS {match.away_team}</h2>
          </div>
          <button onClick={onClose} className="p-2 border-2 border-border hover:border-pink-DEFAULT text-faint hover:text-pink-DEFAULT transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Selected outcome */}
          <div className="bg-green-dim border-2 border-green-DEFAULT p-4">
            <p className="text-faint text-xs mb-1">YOUR PICK</p>
            <p className="text-green-DEFAULT text-sm">{outcomeLabel.toUpperCase()}</p>
          </div>

          {/* Pool info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3">
              <p className="text-faint text-xs mb-1">TOTAL POOL</p>
              <p className="text-white text-sm">{formatAura(newTotalPool)}</p>
            </div>
            <div className="card p-3">
              <p className="text-faint text-xs mb-1">EST. ODDS</p>
              <p className="text-yellow-DEFAULT text-sm">{estimatedOdds}x</p>
            </div>
          </div>

          {/* Stake input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-faint text-xs">YOUR STAKE</label>
              <button onClick={handleMax} className="text-green-DEFAULT text-xs hover:underline">
                MAX ({formatAura(userBalance)})
              </button>
            </div>
            <input
              type="number"
              value={stake}
              onChange={e => handleStakeChange(e.target.value)}
              onBlur={() => setStake(String(parseInt(stake) || ""))}
              placeholder="MIN 5 🤫"
              min={5}
              step={1}
              className="pixel-input text-sm"
            />
            {error && (
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle size={11} className="text-pink-DEFAULT flex-shrink-0" />
                <p className="text-pink-DEFAULT text-xs">{error}</p>
              </div>
            )}
          </div>

          {/* Estimated payout */}
          {stakeNum >= 5 && (
            <div className="bg-surface2 border-2 border-border p-4 animate-fade-in">
              <div className="flex justify-between mb-2">
                <p className="text-faint text-xs">STAKE</p>
                <p className="text-white text-xs">{formatAura(stakeNum)}</p>
              </div>
              <div className="flex justify-between mb-2">
                <p className="text-faint text-xs">EST. PAYOUT</p>
                <p className="text-green-DEFAULT text-xs">{formatAura(estimatedPayout)}</p>
              </div>
              <div className="pixel-divider" />
              <div className="flex justify-between">
                <p className="text-faint text-xs">EST. PROFIT</p>
                <p className={`text-xs ${estimatedPayout > stakeNum ? "text-green-DEFAULT" : "text-pink-DEFAULT"}`}>
                  {estimatedPayout > stakeNum ? "+" : ""}{formatAura(estimatedPayout - stakeNum)}
                </p>
              </div>
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={loading || !stake || parseInt(stake) < 5}
            className="btn-pixel btn-green w-full text-sm py-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? "PLACING PREDICTION..." : <span className="flex items-center gap-2">LOCK IN {stake ? formatAura(parseInt(stake)) : "🤫"} <ArrowRight size={14} className="-mt-[2px]" /></span>}
          </button>

          <p className="text-faint text-xs text-center">
            PREDICTIONS ARE FINAL. NO CANCELLATIONS.
          </p>
        </div>
      </div>
    </div>
  );
}