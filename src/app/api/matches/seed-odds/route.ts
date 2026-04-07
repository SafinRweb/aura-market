import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEAM_STRENGTH: Record<string, number> = {
    "Spain": 1, "France": 2, "Argentina": 3, "England": 4,
    "Brazil": 5, "Portugal": 6, "Netherlands": 7, "Belgium": 8,
    "Germany": 9, "Croatia": 10, "Uruguay": 11, "Colombia": 12,
    "Morocco": 13, "USA": 14, "Mexico": 15, "Japan": 16,
    "South Korea": 17, "Australia": 18, "Switzerland": 19,
    "Austria": 20, "Turkiye": 21, "Turkey": 21, "Norway": 22,
    "Sweden": 23, "Czechia": 24, "Ecuador": 25, "Senegal": 26,
    "Canada": 27, "Scotland": 28, "Algeria": 29, "Tunisia": 30,
    "Paraguay": 31, "Qatar": 32, "South Africa": 33, "Egypt": 34,
    "Ivory Coast": 35, "Ghana": 36, "Panama": 37,
    "Iran": 38, "Saudi Arabia": 39, "Bosnia and Herzegovina": 40,
    "New Zealand": 41, "Jordan": 42, "Uzbekistan": 43,
    "Cape Verde": 44, "Curacao": 45, "Haiti": 46,
    "DR Congo": 47, "Iraq": 48,
};

function getStrength(team: string): number {
    return TEAM_STRENGTH[team] || 35;
}

function generateSeeds(
    homeTeam: string,
    awayTeam: string,
    total: number = 1000
) {
    const h = 1 / getStrength(homeTeam);
    const a = 1 / getStrength(awayTeam);
    const d = 0.28;
    const t = h + a + d;

    return {
        match_winner: {
            home: Math.floor(total * (h / t)),
            draw: Math.floor(total * (d / t)),
            away: Math.floor(total * (a / t)),
        },
        over_under: {
            over: Math.floor(total * 0.48),
            under: Math.floor(total * 0.52),
        },
        btts: {
            yes: Math.floor(total * 0.46),
            no: Math.floor(total * 0.54),
        },
        first_scorer: {
            home: Math.floor(total * (h / t) * 0.9),
            away: Math.floor(total * (a / t) * 0.9),
            none: Math.floor(total * 0.08),
        },
    };
}

export async function POST(request: Request) {
    try {
        const { match_id } = await request.json();

        // Get match
        const { data: match } = await supabase
            .from("matches")
            .select("*")
            .eq("id", match_id)
            .single();

        if (!match) {
            return NextResponse.json({ error: "Match not found" }, { status: 404 });
        }

        // Check if pools already seeded
        const { data: existing } = await supabase
            .from("pools")
            .select("id")
            .eq("match_id", match_id)
            .limit(1);

        if (existing && existing.length > 0) {
            return NextResponse.json({ message: "Already seeded" });
        }

        const seeds = generateSeeds(match.home_team, match.away_team);

        // Insert all pool entries
        const poolEntries = [];
        for (const [market, outcomes] of Object.entries(seeds)) {
            for (const [outcome, amount] of Object.entries(outcomes)) {
                poolEntries.push({
                    match_id,
                    market_type: market,
                    outcome,
                    total_staked: amount,
                    is_seed: true, // flag so we know it's not real money
                });
            }
        }

        await supabase.from("pools").insert(poolEntries);

        return NextResponse.json({
            success: true,
            message: `Seeded ${poolEntries.length} pool entries`,
            seeds,
        });

    } catch (err) {
        return NextResponse.json(
            { error: String(err) },
            { status: 500 }
        );
    }
}

// Seed all matches that have no pools yet
export async function GET() {
    try {
        const { data: matches } = await supabase
            .from("matches")
            .select("id, home_team, away_team")
            .eq("status", "upcoming");

        if (!matches || matches.length === 0) {
            return NextResponse.json({ message: "No upcoming matches" });
        }

        let seeded = 0;

        for (const match of matches) {
            const { data: existing } = await supabase
                .from("pools")
                .select("id")
                .eq("match_id", match.id)
                .limit(1);

            if (existing && existing.length > 0) continue;

            const seeds = generateSeeds(match.home_team, match.away_team);

            const poolEntries = [];
            for (const [market, outcomes] of Object.entries(seeds)) {
                for (const [outcome, amount] of Object.entries(outcomes)) {
                    poolEntries.push({
                        match_id: match.id,
                        market_type: market,
                        outcome,
                        total_staked: amount,
                        is_seed: true,
                    });
                }
            }

            await supabase.from("pools").insert(poolEntries);
            seeded++;
        }

        return NextResponse.json({
            success: true,
            message: `Seeded ${seeded} matches`,
        });

    } catch (err) {
        return NextResponse.json(
            { error: String(err) },
            { status: 500 }
        );
    }
}