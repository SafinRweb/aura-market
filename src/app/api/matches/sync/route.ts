import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FOOTBALL_API_KEY = process.env.FOOTBALL_DATA_API_KEY!;

const TEAM_FLAGS: Record<string, string> = {
    "Mexico": "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Czechia": "🇨🇿",
    "Canada": "🇨🇦", "Bosnia and Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Switzerland": "🇨🇭",
    "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "USA": "🇺🇸", "United States": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺",
    "Turkiye": "🇹🇷", "Turkey": "🇹🇷", "Germany": "🇩🇪", "Curacao": "🇨🇼",
    "Curaçao": "🇨🇼", "Ivory Coast": "🇨🇮", "Côte d'Ivoire": "🇨🇮", "Ecuador": "🇪🇨",
    "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
    "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
    "Spain": "🇪🇸", "Cape Verde": "🇨🇻", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
    "France": "🇫🇷", "Senegal": "🇸🇳", "Norway": "🇳🇴", "Iraq": "🇮🇶",
    "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
    "Portugal": "🇵🇹", "DR Congo": "🇨🇩", "Congo DR": "🇨🇩",
    "Democratic Republic of Congo": "🇨🇩",
    "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
    "Korea Republic": "🇰🇷", "Bosnia Herzegovina": "🇧🇦",
};

function getFlag(name: string): string {
    return TEAM_FLAGS[name] || "🏳️";
}

function getStage(stage: string): string {
    const map: Record<string, string> = {
        "GROUP_STAGE": "group",
        "LAST_32": "round_of_32",
        "LAST_16": "round_of_16",
        "QUARTER_FINALS": "quarter",
        "SEMI_FINALS": "semi",
        "THIRD_PLACE": "third_place",
        "FINAL": "final",
    };
    return map[stage] || "group";
}

function getStatus(apiStatus: string): string {
    if (["IN_PLAY", "PAUSED", "HALFTIME"].includes(apiStatus)) return "live";
    if (["FINISHED", "AWARDED"].includes(apiStatus)) return "finished";
    if (["CANCELLED", "SUSPENDED", "POSTPONED"].includes(apiStatus)) return "void";
    return "upcoming";
}

const COMPETITION_IDS = [2000];

export async function GET() {
    try {
        let allMatches: Record<string, unknown>[] = [];
        let competitionName = "FIFA World Cup 2026";
        let foundData = false;

        for (const compId of COMPETITION_IDS) {
            try {
                const res = await fetch(
                    `https://api.football-data.org/v4/competitions/${compId}/matches`,
                    {
                        headers: { "X-Auth-Token": FOOTBALL_API_KEY },
                        next: { revalidate: 3600 },
                    }
                );
                if (!res.ok) continue;
                const data = await res.json();
                if (data.matches && data.matches.length > 0) {
                    allMatches = data.matches;
                    competitionName = data.competition?.name || competitionName;
                    foundData = true;
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!foundData || allMatches.length === 0) {
            return NextResponse.json({
                success: true,
                synced: 0,
                message: "NO_DATA",
                fixtures_released: false,
            });
        }

        let synced = 0;
        let updated = 0;

        for (const match of allMatches) {
            const homeTeam = (match.homeTeam as Record<string, string>)?.name || "TBD";
            const awayTeam = (match.awayTeam as Record<string, string>)?.name || "TBD";
            const score = match.score as Record<string, Record<string, number>>;
            const status = getStatus(match.status as string);
            const stage = getStage(match.stage as string);
            const rawGroup = match.group as string | null;
            const group = rawGroup
                ? rawGroup.replace("GROUP_", "GROUP ")
                : null;

            const matchData = {
                home_team: homeTeam,
                away_team: awayTeam,
                home_flag: getFlag(homeTeam),
                away_flag: getFlag(awayTeam),
                kickoff_time: match.utcDate as string,
                status,
                home_score: score?.fullTime?.home ?? 0,
                away_score: score?.fullTime?.away ?? 0,
                competition: competitionName,
                stage,
                group_name: group,
                venue: (match.venue as string) || "",
                api_match_id: String(match.id),
            };

            const { data: existing } = await supabase
                .from("matches")
                .select("id")
                .eq("api_match_id", String(match.id))
                .single();

            if (existing) {
                const { error } = await supabase
                    .from("matches")
                    .update(matchData)
                    .eq("api_match_id", String(match.id));
                if (!error) updated++;
            } else {
                const { error } = await supabase
                    .from("matches")
                    .insert(matchData);
                if (!error) synced++;
            }
        }

        return NextResponse.json({
            success: true,
            synced,
            updated,
            total: allMatches.length,
            competition: competitionName,
            fixtures_released: true,
            message: `Synced ${synced} new, updated ${updated} existing`,
        });

    } catch (err) {
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 }
        );
    }
}