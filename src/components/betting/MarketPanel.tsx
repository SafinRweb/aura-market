"use client";
import { Match, Pool, Bet } from "@/types";
import { MarketType } from "@/types";
import { formatAura, marketLabel, isMatchBettable } from "@/lib/utils";
import { Lock, CheckCircle, TrendingUp } from "lucide-react";

interface MarketOption {
  label: string;
  value: string;
}

interface Props {
  match: Match;
  marketType: MarketType;
  options: MarketOption[];
  pools: Pool[];
  userBet: Bet | null;
  onSelect: (outcome: string, outcomeLabel: string) => void;
}

export default function MarketPanel({
  match, marketType, options, pools, userBet, onSelect
}: Props) {
  const bettable = isMatchBettable(match.status);

  const totalPool = pools
    .filter(p => p.market_type === marketType)
    .reduce((sum, p) => sum + p.total_staked, 0);

  function getPoolAmount(outcome: string) {
    return pools.find(p =>
      p.market_type === marketType && p.outcome === outcome
    )?.total_staked || 0;
  }

  function getOdds(outcome: string) {
    const side = getPoolAmount(outcome);
    if (totalPool === 0 || side === 0) return "—";
    return (totalPool / side).toFixed(2) + "x";
  }

  function getPoolPercent(outcome: string) {
    if (totalPool === 0) return 0;
    return Math.round((getPoolAmount(outcome) / totalPool) * 100);
  }

  // Determine the "hot" option (highest pool %)
  const hotOption = options.reduce((best, opt) => {
    const pct = getPoolPercent(opt.value);
    return pct > (best.pct || 0) ? { value: opt.value, pct } : best;
  }, { value: "", pct: 0 });

  return (
    <div className="glass-panel overflow-hidden">
      {/* Market header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className="text-green-DEFAULT" />
          <h3 className="text-white text-xs sm:text-sm">{marketLabel(marketType)}</h3>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-faint text-2xs sm:text-xs">
            POOL: {formatAura(totalPool)}
          </span>
          {userBet && (
            <span className="flex items-center gap-1 text-green-DEFAULT text-2xs">
              <CheckCircle size={10} />
              <span className="hidden sm:inline">PREDICTION PLACED</span>
              <span className="sm:hidden">✓</span>
            </span>
          )}
          {!bettable && (
            <span className="flex items-center gap-1 text-pink-DEFAULT text-2xs">
              <Lock size={10} />
              <span className="hidden sm:inline">LOCKED</span>
            </span>
          )}
        </div>
      </div>

      {/* Your bet info */}
      {userBet && (
        <div className="bg-green-dim border-b border-green-DEFAULT/30 p-3 flex items-center justify-between">
          <p className="text-green-DEFAULT text-2xs sm:text-xs">
            YOUR PREDICTION: {userBet.outcome.toUpperCase()} · {formatAura(userBet.stake)}
          </p>
          <p className="text-faint text-2xs sm:text-xs">
            EST. RETURN: {formatAura(userBet.potential_payout)}
          </p>
        </div>
      )}

      {/* Options Grid — 1 col mobile, responsive on desktop */}
      <div className="p-3 sm:p-4 grid gap-2 sm:gap-3"
        style={{
          gridTemplateColumns:
            options.length === 2
              ? "1fr 1fr"
              : `repeat(${options.length}, 1fr)`
        }}>
        {options.map(option => {
          const percent = getPoolPercent(option.value);
          const odds = getOdds(option.value);
          const isMyBet = userBet?.outcome === option.value;
          const isHot = hotOption.value === option.value && totalPool > 0;

          return (
            <button
              key={option.value}
              onClick={() => bettable && !userBet && onSelect(option.value, option.label)}
              disabled={!bettable || !!userBet}
              className={`market-option relative overflow-hidden p-3 sm:p-4 border-2 text-left
                ${isMyBet
                  ? "border-green-DEFAULT bg-green-dim"
                  : bettable && !userBet
                    ? "border-border hover:border-green-DEFAULT/60 bg-surface2/50 cursor-pointer"
                    : "border-border opacity-60 cursor-not-allowed"
                }`}
            >
              {/* Animated pool bar */}
              <div className="absolute bottom-0 left-0 h-[3px] odds-bar-fill"
                style={{
                  width: `${percent}%`,
                  background: isMyBet
                    ? "rgba(0, 255, 135, 0.6)"
                    : isHot
                      ? "linear-gradient(90deg, rgba(0, 255, 135, 0.3), rgba(0, 255, 135, 0.6))"
                      : "rgba(0, 255, 135, 0.2)"
                }}
              />



              {/* Option Label */}
              <p className={`text-2xs sm:text-xs mb-2 ${isMyBet ? "text-green-DEFAULT" : "text-white"}`}>
                {option.label.toUpperCase()}
              </p>

              {/* Odds + Percent row */}
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs sm:text-sm font-bold ${
                  isMyBet ? "text-green-DEFAULT" : odds !== "—" ? "text-yellow-DEFAULT" : "text-faint"
                }`}>
                  {odds}
                </span>
                <span className="text-faint text-2xs">{percent}%</span>
              </div>

              {/* My bet marker */}
              {isMyBet && (
                <p className="text-green-DEFAULT text-2xs mt-2 flex items-center gap-1">
                  <CheckCircle size={8} /> YOUR PICK
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}