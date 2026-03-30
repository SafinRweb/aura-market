"use client";
import { Match, Pool, Bet } from "@/types";
import { MarketType } from "@/types";
import { formatAura, marketLabel, isMatchBettable } from "@/lib/utils";
import { Lock, CheckCircle } from "lucide-react";

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

  return (
    <div className="card overflow-hidden">
      {/* Market header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-border bg-surface2">
        <h3 className="text-white text-sm">{marketLabel(marketType)}</h3>
        <div className="flex items-center gap-3">
          <span className="text-faint text-xs">
            POOL: {formatAura(totalPool)}
          </span>
          {userBet && (
            <span className="flex items-center gap-1 text-green-DEFAULT text-xs">
              <CheckCircle size={11} />
              BET PLACED
            </span>
          )}
          {!bettable && (
            <span className="flex items-center gap-1 text-pink-DEFAULT text-xs">
              <Lock size={11} />
              LOCKED
            </span>
          )}
        </div>
      </div>

      {/* Your bet info */}
      {userBet && (
        <div className="bg-green-dim border-b-2 border-green-DEFAULT p-3 flex items-center justify-between">
          <p className="text-green-DEFAULT text-xs">
            YOUR BET: {userBet.outcome.toUpperCase()} · {formatAura(userBet.stake)}
          </p>
          <p className="text-faint text-xs">
            EST. RETURN: {formatAura(userBet.potential_payout)}
          </p>
        </div>
      )}

      {/* Options */}
      <div className="p-4 grid gap-3"
        style={{gridTemplateColumns: options.length === 2 ? "1fr 1fr" : options.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr"}}>
        {options.map(option => {
          const percent = getPoolPercent(option.value);
          const isMyBet = userBet?.outcome === option.value;

          return (
            <button
              key={option.value}
              onClick={() => bettable && !userBet && onSelect(option.value, option.label)}
              disabled={!bettable || !!userBet}
              className={`relative overflow-hidden p-4 border-2 text-left transition-all
                ${isMyBet
                  ? "border-green-DEFAULT bg-green-dim"
                  : bettable && !userBet
                    ? "border-border hover:border-green-DEFAULT hover:bg-surface2 cursor-pointer"
                    : "border-border opacity-60 cursor-not-allowed"
                }`}
            >
              {/* Pool bar */}
              <div
                className="absolute bottom-0 left-0 h-1 bg-green-DEFAULT opacity-30 transition-all"
                style={{width: `${percent}%`}}
              />

              <p className={`text-sm mb-2 ${isMyBet ? "text-green-DEFAULT" : "text-white"}`}>
                {option.label.toUpperCase()}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-faint text-xs">{getOdds(option.value)}</p>
                <p className="text-faint text-xs">{percent}%</p>
              </div>
              {isMyBet && (
                <p className="text-green-DEFAULT text-xs mt-1">✓ YOUR PICK</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}