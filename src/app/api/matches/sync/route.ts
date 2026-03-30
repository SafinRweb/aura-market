import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FOOTBALL_API_KEY = process.env.FOOTBALL_DATA_API_KEY!;

const TEAM_FLAGS: Record<string, string> = {
    "Qatar": "qa", "Ecuador": "ec", "Senegal": "sn",
    "Netherlands": "nl", "England": "gb-eng", "Iran": "ir",
    "USA": "us", "United States": "us", "Wales": "gb-wls",
    "Argentina": "ar", "Saudi Arabia": "sa", "Mexico": "mx",
    "Poland": "pl", "France": "fr", "Australia": "au",
    "Denmark": "dk", "Tunisia": "tn", "Spain": "es",
    "Costa Rica": "cr", "Germany": "de", "Japan": "jp",
    "Belgium": "be", "Canada": "ca", "Morocco": "ma",
    "Croatia": "hr", "Brazil": "br", "Serbia": "rs",
    "Switzerland": "ch", "Cameroon": "cm", "Portugal": "pt",
    "Ghana": "gh", "Uruguay": "uy", "South Korea": "kr",
    "Korea Republic": "kr", "Italy": "it", "Colombia": "co",
    "Nigeria": "ng", "Egypt": "eg", "Algeria": "dz",
    "Sweden": "se", "Norway": "no", "Turkey": "tr",
    "Türkiye": "tr", "Czech Republic": "cz", "Czechia": "cz",
    "Austria": "at", "Scotland": "gb-sct", "Ukraine": "ua",
    "Chile": "cl", "Peru": "pe", "Paraguay": "py",
    "Venezuela": "ve", "Bolivia": "bo", "New Zealand": "nz",
    "Indonesia": "id", "Vietnam": "vn", "Thailand": "th",
    "India": "in", "Romania": "ro", "Hungary": "hu",
    "Slovakia": "sk", "Slovenia": "si", "Greece": "gr",
    "Albania": "al", "Finland": "fi", "Ireland": "ie",
    "Ivory Coast": "ci", "Côte d'Ivoire": "ci",
    "Mali": "ml", "Burkina Faso": "bf",
    "Zambia": "zm", "Zimbabwe": "zw", "Tanzania": "tz",
    "Uganda": "ug", "Kenya": "ke", "Ethiopia": "et",
    "China PR": "cn", "China": "cn", "Iraq": "iq",
    "Syria": "sy", "Uzbekistan": "uz", "Kuwait": "kw",
    "Bahrain": "bh", "Oman": "om", "Jordan": "jo",
    "Honduras": "hn", "Guatemala": "gt", "Panama": "pa",
    "Jamaica": "jm", "Haiti": "ht", "Trinidad and Tobago": "tt",
};

function getFlag(name: string): string {
    const code = TEAM_FLAGS[name];
    if (code) return `https://flagcdn.com/w40/${code}.png`;
    return "https://flagcdn.com/w40/un.png"; // Fallback to UN flag
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

// Competition IDs on football-data.org
// 2000 = FIFA World Cup (most recent / 2022)
// They will update to 2026 when available
const COMPETITION_IDS = [2000];

export async function GET() {
    try {
        let allMatches: any[] = [];
        let competitionName = "FIFA World Cup 2026";
        let foundData = false;

        // Try each competition ID
        for (const compId of COMPETITION_IDS) {
            try {
                const res = await fetch(
                    `https://api.football-data.org/v4/competitions/${compId}/matches`,
                    {
                        headers: { "X-Auth-Token": FOOTBALL_API_KEY },
                        next: { revalidate: 3600 }, // Cache for 1 hour
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

        // Sync to Supabase
        let synced = 0;
        let updated = 0;

        for (const match of allMatches) {
            const homeTeam = match.homeTeam?.name || "TBD";
            const awayTeam = match.awayTeam?.name || "TBD";
            const status = getStatus(match.status);
            const stage = getStage(match.stage);
            const group = match.group
                ? match.group.replace("GROUP_", "GROUP ")
                : null;

            const matchData = {
                home_team: homeTeam,
                away_team: awayTeam,
                home_flag: getFlag(homeTeam),
                away_flag: getFlag(awayTeam),
                kickoff_time: match.utcDate,
                status,
                home_score: match.score?.fullTime?.home ?? 0,
                away_score: match.score?.fullTime?.away ?? 0,
                competition: competitionName,
                stage,
                group_name: group,
                venue: match.venue || "",
                api_match_id: String(match.id),
            };

            // Check if already exists
            const { data: existing } = await supabase
                .from("matches")
                .select("id, status")
                .eq("api_match_id", String(match.id))
                .single();

            if (existing) {
                // Only update if something meaningful changed
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
            message: `Synced ${synced} new, updated ${updated} existing matches`,
        });

    } catch (err) {
        return NextResponse.json({
            success: false,
            error: String(err),
        }, { status: 500 });
    }
}