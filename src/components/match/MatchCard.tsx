"use client";
import { Match } from "@/types";
import { formatKickoff, timeUntilKickoff, isMatchBettable } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MatchCard({ match }: { match: Match }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (match.status !== "upcoming") return;
    const interval = setInterval(() => {
      setCountdown(timeUntilKickoff(match.kickoff_time));
    }, 1000);
    setCountdown(timeUntilKickoff(match.kickoff_time));
    return () => clearInterval(interval);
  }, [match.kickoff_time, match.status]);

  const statusColor = {
    upcoming: "text-yellow-DEFAULT border-yellow-DEFAULT bg-yellow-dim",
    live: "text-pink-DEFAULT border-pink-DEFAULT bg-pink-dim",
    finished: "text-faint border-border bg-surface",
    void: "text-faint border-border bg-surface",
  }[match.status];

  return (
    <div
      onClick={() => router.push(`/match/${match.id}`)}
      className="card card-hover cursor-pointer relative overflow-hidden p-4"
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-faint text-xs">{match.group || match.stage.toUpperCase()}</span>
        <span className={`badge ${statusColor}`}>
          {match.status === "live" ? (
            <span className="flex items-center gap-1">
              <span className="live-dot" /> LIVE
            </span>
          ) : match.status.toUpperCase()}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between my-4">
        <div className="flex flex-col items-center gap-2 flex-1">
          {match.home_flag?.startsWith('http') ? (
            <img src={match.home_flag} alt={match.home_team} className="w-10 h-7 object-cover rounded-[2px]" />
          ) : (
            <span className="text-3xl">{match.home_flag}</span>
          )}
          <span className="text-white text-xs text-center leading-relaxed">
            {match.home_team.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-col items-center px-4">
          {match.status === "finished" || match.status === "live" ? (
            <span className="text-xl text-white">
              {match.home_score} - {match.away_score}
            </span>
          ) : (
            <span className="text-faint text-xs">VS</span>
          )}
          {match.status === "upcoming" && (
            <span className="text-yellow-DEFAULT text-xs mt-1">{countdown}</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 flex-1">
          {match.away_flag?.startsWith('http') ? (
            <img src={match.away_flag} alt={match.away_team} className="w-10 h-7 object-cover rounded-[2px]" />
          ) : (
            <span className="text-3xl">{match.away_flag}</span>
          )}
          <span className="text-white text-xs text-center leading-relaxed">
            {match.away_team.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-border pt-3 flex items-center justify-between">
        <span className="text-faint text-xs">{formatKickoff(match.kickoff_time)}</span>
        {isMatchBettable(match.status) && (
          <span className="text-green-DEFAULT text-xs">BET NOW →</span>
        )}
      </div>
    </div>
  );
}