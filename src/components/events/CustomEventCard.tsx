"use client";
import { useState } from "react";
import { CustomEvent, CustomEventOption } from "@/types";
import { Zap, CheckCircle } from "lucide-react";

interface Props {
    event: CustomEvent;
    userVoteId?: string; // option_id they voted for
    onVote: (eventId: string, optionId: string) => Promise<boolean>; // return true if success
}

export default function CustomEventCard({ event, userVoteId, onVote }: Props) {
    const [voting, setVoting] = useState<string | null>(null);

    async function handleVote(optionId: string) {
        if (userVoteId) return; // already voted
        setVoting(optionId);
        await onVote(event.id, optionId);
        setVoting(null);
    }

    return (
        <div className="card p-5 border-2 border-blue-DEFAULT/50 bg-blue-dim/10 relative overflow-hidden group">
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-DEFAULT opacity-5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="badge border-blue-DEFAULT text-blue-DEFAULT bg-blue-dim">
                        <Zap size={10} className="inline mr-1" /> SPECIAL EVENT
                    </span>
                    <span className="badge border-yellow-DEFAULT text-yellow-DEFAULT bg-yellow-dim">
                        {event.reward_amount} AURA {event.reward_type === 'win' ? 'IF YOU WIN' : 'FOR VOTING'}
                    </span>
                </div>
            </div>

            <h3 className="text-white text-base font-bold mb-4 leading-normal relative z-10">{event.question}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                {event.options?.map(opt => {
                    const isVoted = userVoteId === opt.id;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleVote(opt.id)}
                            disabled={!!userVoteId || voting !== null}
                            className={`p-3 border-2 transition-all text-left flex items-center justify-between text-sm
                                ${isVoted ? 'border-green-DEFAULT bg-green-dim text-white' : 
                                  userVoteId ? 'border-border bg-bg text-faint opacity-50' : 
                                  'border-border hover:border-blue-DEFAULT hover:bg-surface2 text-white'
                                }`}
                        >
                            <span>{opt.option_text}</span>
                            {voting === opt.id && <span className="animate-pulse text-blue-DEFAULT text-xs">VOTING...</span>}
                            {isVoted && <CheckCircle size={16} className="text-green-DEFAULT shrink-0" />}
                        </button>
                    );
                })}
            </div>
            
            {userVoteId && (
                <p className="mt-4 text-center text-xs text-green-DEFAULT animate-fade-in relative z-10">
                    {event.reward_type === 'participation' ? `Got ${event.reward_amount} Aura by participating!` : 'Your prediction is locked! Good luck.'}
                </p>
            )}
        </div>
    );
}
