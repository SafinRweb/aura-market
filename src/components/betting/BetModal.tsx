"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { Match, Pool } from "@/types";
import { validateStake, formatAura, calcPayout, marketLabel } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { X, AlertTriangle, ArrowRight, TrendingUp, Target } from "lucide-react";
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

const QUICK_STAKES = [10, 25, 50, 100];

export default function BetModal({
  match, marketType, outcome, outcomeLabel,
  pools, userBalance, userId, onClose, onSuccess
}: Props) {
  const [stake, setStake] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const estimatedProfit = estimatedPayout - stakeNum;

  function handleStakeChange(val: string) {
    const clean = val.replace(/[^0-9]/g, "");
    setStake(clean);
    setError(null);
  }

  function handleMax() {
    setStake(String(userBalance));
  }

  function handleQuickStake(amount: number) {
    if (amount <= userBalance) {
      setStake(String(amount));
      setError(null);
    }
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

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Bottom sheet on mobile, centered card on desktop */}
      <div className="bottom-sheet glass-panel-strong w-full sm:max-w-md sm:mx-4 border-t-2 sm:border-2 border-green-DEFAULT/30 safe-area-bottom"
        style={{ boxShadow: "0 -8px 40px rgba(0,255,135,0.1), 0 0 60px rgba(0,0,0,0.5)" }}>

        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5">
          <div className="min-w-0">
            <p className="text-faint text-2xs mb-1">{marketLabel(marketType)}</p>
            <h2 className="text-white text-xs sm:text-sm truncate">
              {match.home_team} VS {match.away_team}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 border border-white/10 hover:border-pink-DEFAULT text-faint hover:text-pink-DEFAULT transition-all ml-3"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">

          {/* Selected outcome chip */}
          <div className="flex items-center gap-3 bg-green-dim/50 border border-green-DEFAULT/30 p-3">
            <Target size={14} className="text-green-DEFAULT flex-shrink-0" />
            <div>
              <p className="text-faint text-2xs">YOUR PICK</p>
              <p className="text-green-DEFAULT text-xs sm:text-sm">{outcomeLabel.toUpperCase()}</p>
            </div>
          </div>

          {/* Pool stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-panel p-3">
              <p className="text-faint text-2xs mb-1">TOTAL POOL</p>
              <p className="text-white text-xs sm:text-sm">{formatAura(newTotalPool)}</p>
            </div>
            <div className="glass-panel p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp size={9} className="text-yellow-DEFAULT" />
                <p className="text-faint text-2xs">EST. ODDS</p>
              </div>
              <p className="text-yellow-DEFAULT text-xs sm:text-sm">{estimatedOdds}x</p>
            </div>
          </div>

          {/* Stake input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-faint text-2xs">YOUR STAKE</label>
              <button onClick={handleMax} className="text-green-DEFAULT text-2xs hover:underline">
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
              className="pixel-input text-xs sm:text-sm"
              autoFocus
            />

            {/* Quick stake buttons */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {QUICK_STAKES.map(amount => (
                <button
                  key={amount}
                  onClick={() => handleQuickStake(amount)}
                  disabled={amount > userBalance}
                  className={`p-2 border text-2xs text-center transition-all
                    ${amount > userBalance
                      ? "border-border text-faint opacity-40 cursor-not-allowed"
                      : stake === String(amount)
                        ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                        : "border-border text-faint hover:border-green-DEFAULT/50 hover:text-white cursor-pointer"
                    }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle size={11} className="text-pink-DEFAULT flex-shrink-0" />
                <p className="text-pink-DEFAULT text-2xs">{error}</p>
              </div>
            )}
          </div>

          {/* Estimated payout breakdown */}
          {stakeNum >= 5 && (
            <div className="glass-panel p-3 sm:p-4 animate-fade-in space-y-2">
              <div className="flex justify-between">
                <p className="text-faint text-2xs">STAKE</p>
                <p className="text-white text-2xs">{formatAura(stakeNum)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-faint text-2xs">EST. PAYOUT</p>
                <p className="text-green-DEFAULT text-2xs">{formatAura(estimatedPayout)}</p>
              </div>
              <div className="pixel-divider" style={{ margin: "8px 0" }} />
              <div className="flex justify-between">
                <p className="text-faint text-2xs">EST. PROFIT</p>
                <p className={`text-xs ${estimatedProfit > 0 ? "text-green-DEFAULT" : "text-pink-DEFAULT"}`}>
                  {estimatedProfit > 0 ? "+" : ""}{formatAura(estimatedProfit)}
                </p>
              </div>
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={loading || !stake || parseInt(stake) < 5}
            className="btn-pixel btn-green w-full text-2xs sm:text-xs py-3 sm:py-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              "PLACING PREDICTION..."
            ) : (
              <span className="flex items-center gap-2">
                LOCK IN {stake ? formatAura(parseInt(stake)) : "🤫"}
                <ArrowRight size={14} className="-mt-[1px]" />
              </span>
            )}
          </button>

          <p className="text-faint text-2xs text-center pb-1">
            PREDICTIONS ARE FINAL. NO CANCELLATIONS.
          </p>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}