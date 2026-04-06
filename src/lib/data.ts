export const TEAM_FLAGS: Record<string, string> = {
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

export interface TeamEntry {
    name: string;
    flag: string;
    host?: boolean;
    playoff?: boolean;
    debut?: boolean;
}

export const GROUPS: { name: string; teams: TeamEntry[] }[] = [
    {
        name: "GROUP A",
        teams: [
            { name: "Mexico", flag: "🇲🇽", host: true },
            { name: "South Africa", flag: "🇿🇦" },
            { name: "South Korea", flag: "🇰🇷" },
            { name: "Czechia", flag: "🇨🇿", playoff: true },
        ],
    },
    {
        name: "GROUP B",
        teams: [
            { name: "Canada", flag: "🇨🇦", host: true },
            { name: "Bosnia and Herzegovina", flag: "🇧🇦", playoff: true },
            { name: "Qatar", flag: "🇶🇦" },
            { name: "Switzerland", flag: "🇨🇭" },
        ],
    },
    {
        name: "GROUP C",
        teams: [
            { name: "Brazil", flag: "🇧🇷" },
            { name: "Morocco", flag: "🇲🇦" },
            { name: "Haiti", flag: "🇭🇹" },
            { name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
        ],
    },
    {
        name: "GROUP D",
        teams: [
            { name: "USA", flag: "🇺🇸", host: true },
            { name: "Paraguay", flag: "🇵🇾" },
            { name: "Australia", flag: "🇦🇺" },
            { name: "Turkiye", flag: "🇹🇷", playoff: true },
        ],
    },
    {
        name: "GROUP E",
        teams: [
            { name: "Germany", flag: "🇩🇪" },
            { name: "Curacao", flag: "🇨🇼", debut: true },
            { name: "Ivory Coast", flag: "🇨🇮" },
            { name: "Ecuador", flag: "🇪🇨" },
        ],
    },
    {
        name: "GROUP F",
        teams: [
            { name: "Netherlands", flag: "🇳🇱" },
            { name: "Japan", flag: "🇯🇵" },
            { name: "Sweden", flag: "🇸🇪", playoff: true },
            { name: "Tunisia", flag: "🇹🇳" },
        ],
    },
    {
        name: "GROUP G",
        teams: [
            { name: "Belgium", flag: "🇧🇪" },
            { name: "Egypt", flag: "🇪🇬" },
            { name: "Iran", flag: "🇮🇷" },
            { name: "New Zealand", flag: "🇳🇿" },
        ],
    },
    {
        name: "GROUP H",
        teams: [
            { name: "Spain", flag: "🇪🇸" },
            { name: "Cape Verde", flag: "🇨🇻", debut: true },
            { name: "Saudi Arabia", flag: "🇸🇦" },
            { name: "Uruguay", flag: "🇺🇾" },
        ],
    },
    {
        name: "GROUP I",
        teams: [
            { name: "France", flag: "🇫🇷" },
            { name: "Senegal", flag: "🇸🇳" },
            { name: "Norway", flag: "🇳🇴" },
            { name: "Iraq", flag: "🇮🇶", playoff: true },
        ],
    },
    {
        name: "GROUP J",
        teams: [
            { name: "Argentina", flag: "🇦🇷" },
            { name: "Algeria", flag: "🇩🇿" },
            { name: "Austria", flag: "🇦🇹" },
            { name: "Jordan", flag: "🇯🇴", debut: true },
        ],
    },
    {
        name: "GROUP K",
        teams: [
            { name: "Portugal", flag: "🇵🇹" },
            { name: "DR Congo", flag: "🇨🇩", playoff: true },
            { name: "Uzbekistan", flag: "🇺🇿", debut: true },
            { name: "Colombia", flag: "🇨🇴" },
        ],
    },
    {
        name: "GROUP L",
        teams: [
            { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
            { name: "Croatia", flag: "🇭🇷" },
            { name: "Ghana", flag: "🇬🇭" },
            { name: "Panama", flag: "🇵🇦" },
        ],
    },
];

export const VENUES = [
    { name: "MetLife Stadium", city: "New York / New Jersey", country: "🇺🇸", note: "FINAL VENUE" },
    { name: "SoFi Stadium", city: "Los Angeles", country: "🇺🇸", note: "" },
    { name: "AT&T Stadium", city: "Dallas", country: "🇺🇸", note: "" },
    { name: "Estadio Azteca", city: "Mexico City", country: "🇲🇽", note: "OPENING MATCH" },
    { name: "Arrowhead Stadium", city: "Kansas City", country: "🇺🇸", note: "" },
    { name: "Levi's Stadium", city: "San Francisco", country: "🇺🇸", note: "" },
    { name: "Rose Bowl", city: "Los Angeles", country: "🇺🇸", note: "" },
    { name: "Hard Rock Stadium", city: "Miami", country: "🇺🇸", note: "" },
    { name: "Gillette Stadium", city: "Boston", country: "🇺🇸", note: "" },
    { name: "Lincoln Financial Field", city: "Philadelphia", country: "🇺🇸", note: "" },
    { name: "Lumen Field", city: "Seattle", country: "🇺🇸", note: "" },
    { name: "BC Place", city: "Vancouver", country: "🇨🇦", note: "" },
    { name: "BMO Field", city: "Toronto", country: "🇨🇦", note: "" },
    { name: "Estadio Akron", city: "Guadalajara", country: "🇲🇽", note: "" },
    { name: "Estadio BBVA", city: "Monterrey", country: "🇲🇽", note: "" },
    { name: "Q2 Stadium", city: "Austin", country: "🇺🇸", note: "" },
];
