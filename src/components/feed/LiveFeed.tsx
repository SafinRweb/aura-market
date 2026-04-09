"use client";
import { LiveFeedItem } from "@/types";
import { timeAgo } from "@/lib/utils";
import Image from "next/image";
import { AuraAmount } from "@/components/ui/AuraPoints";

export default function LiveFeed({ items }: { items: LiveFeedItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-faint text-xs">NO PREDICTIONS YET</p>
        <p className="text-faint text-xs mt-2">BE THE FIRST</p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden max-h-[600px] overflow-y-auto">
      {items.map((item) => (
        <div
          key={item.id}
          className={`p-3 border-b-2 border-border animate-fade-in hover:bg-surface2 transition-colors`}
        >
          <div className="flex items-center gap-2 mb-2">
            {/* Avatar */}
            <div className="w-6 h-6 bg-surface2 border-2 border-border flex items-center justify-center flex-shrink-0">
              {item.avatar_url ? (
                <Image src={item.avatar_url} alt="Avatar" width={24} height={24} className="w-full h-full object-cover" />
              ) : (
                <span className="text-green-DEFAULT" style={{fontSize:"6px"}}>
                  {item.username?.slice(0,2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-green-DEFAULT text-xs font-bold truncate">
              {item.username}
            </span>
            <span className="text-faint text-xs ml-auto flex-shrink-0">
              {timeAgo(item.created_at)}
            </span>
          </div>

          <div className="pl-8">
            <p className="text-faint text-xs mb-1">
              {item.match_home} vs {item.match_away}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-white text-xs">{item.outcome.toUpperCase()}</span>
              <span className="text-faint text-xs">·</span>
              <span className="text-green-DEFAULT text-xs"><AuraAmount amount={item.stake} /></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}