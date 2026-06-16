// AscendAI seasons: fixed 45-day blocks aligned to a January 1st grid
// (Jan 1 -> Feb 15 -> Apr 1 -> ...). SEASON_1_START_UTC is the start of the
// grid block that contained the day seasons shipped, so that block is
// branded "Season 1" rather than whatever raw count the Jan 1 grid implies.
// Every later block is +45 days from the previous one, so the boundaries
// stay locked to the original Jan 1 grid forever.
const DAY_MS = 24 * 60 * 60 * 1000;
const SEASON_LENGTH_DAYS = 45;
const SEASON_1_START_UTC = Date.UTC(2026, 4, 16); // 2026-05-16

export function getCurrentSeason(now = new Date()) {
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const daysSinceAnchor = Math.floor((nowUTC - SEASON_1_START_UTC) / DAY_MS);
    const seasonIndex = Math.max(0, Math.floor(daysSinceAnchor / SEASON_LENGTH_DAYS));

    const startMs = SEASON_1_START_UTC + seasonIndex * SEASON_LENGTH_DAYS * DAY_MS;
    const endMs = startMs + SEASON_LENGTH_DAYS * DAY_MS;
    const dayInSeason = Math.max(1, Math.floor((nowUTC - startMs) / DAY_MS) + 1);

    return {
        number: seasonIndex + 1,
        startDate: new Date(startMs).toISOString().split('T')[0],
        endDate: new Date(endMs).toISOString().split('T')[0],
        dayInSeason,
        totalDays: SEASON_LENGTH_DAYS,
        daysRemaining: Math.max(0, SEASON_LENGTH_DAYS - dayInSeason),
        progressPct: Math.min(100, Math.round((dayInSeason / SEASON_LENGTH_DAYS) * 100)),
    };
}
