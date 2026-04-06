"use client";
import { Match } from "@/types";
import { formatKickoff, timeUntilKickoff, isMatchBettable } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Flag from "@/components/ui/Flag";
import { ArrowRight } from "lucide-react";

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
      className="card card-hover cursor-pointer relative overflow-hidden p-4 touch-manipulation"
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-faint text-xs">
          {match.group 
            ? (match.group.toUpperCase().includes("GROUP") ? match.group.toUpperCase() : `GROUP ${match.group.toUpperCase()}`)
            : (match.stage ? match.stage.toUpperCase().replace(/_/g, " ") : "")}
        </span>
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
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0 px-1">
          <Flag emoji={match.home_flag} size={40} alt={match.home_team} />
          <span className="text-white text-xs text-center leading-tight break-words w-full">
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

        <div className="flex flex-col items-center gap-2 flex-1 min-w-0 px-1">
          <Flag emoji={match.away_flag} size={40} alt={match.away_team} />
          <span className="text-white text-xs text-center leading-tight break-words w-full">
            {match.away_team.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-border pt-3 flex items-center justify-between">
        <span className="text-faint text-xs">{formatKickoff(match.kickoff_time)}</span>
        {isMatchBettable(match.status) && (
          <span className="text-green-DEFAULT text-xs animate-pulse flex items-center justify-center gap-1">PREDICT NOW <ArrowRight size={12} className="-mt-[2px]" /></span>
        )}
      </div>
    </div>
  );
}