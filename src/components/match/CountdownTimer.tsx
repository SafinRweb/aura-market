"use client";
import { useEffect, useState } from "react";
import { timeUntilKickoff } from "@/lib/utils";

interface Props {
  kickoffTime: string;
  status: string;
}

export default function CountdownTimer({ kickoffTime, status }: Props) {
  const [time, setTime] = useState("");

  useEffect(() => {
    if (status !== "upcoming") return;
    const tick = () => setTime(timeUntilKickoff(kickoffTime));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [kickoffTime, status]);

  if (status !== "upcoming") return null;

  return (
    <div className="text-center">
      <p className="text-faint text-xs mb-1">KICKOFF IN</p>
      <p className="text-yellow-DEFAULT text-lg animate-pulse">{time}</p>
    </div>
  );
}