import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// ── Configuration ──
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const ODDS_API_KEY = process.env.ODDS_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const MISE_DEPART = 1000;
const COTE_CIBLE = 1.50;
const TOTAL_JOURS = 17;
const DELAI_APRES_MATCH_MS = 2 * 60 * 60 * 1000;

// ── Logs ──
async function log(level: string, message: string, data: any = {}) {
    try {
        await supabase.from("logs_robot").insert([{ level, message, data, created_at: new Date().toISOString() }]);
    } catch { }
}

// ── Vérification API key (sécurité) ──
function isAuthorized(request: NextRequest): boolean {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return true; // Pas de secret configuré = accès libre
    if (authHeader === `Bearer ${cronSecret}`) return true;
    return false;
}

// ── Helper Delay ──
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ── Cache scores ──
const scoresCache: Record<string, any[]> = {};

async function getRecentScoresForSport(sportKey: string) {
    if (scoresCache[sportKey]) return scoresCache[sportKey];
    try {
        const { data } = await axios.get(`https://api.the-odds-api.com/v4/sports/${sportKey}/scores/`, {
            params: { apiKey: ODDS_API_KEY, daysFrom: 30 },
        });
        const completed = data.filter((m: any) => m.completed && m.scores);
        scoresCache[sportKey] = completed;
        return completed;
    } catch { return []; }
}

// ── Analyse H2H ──
async function analyserForme(teamName: string, sportKey: string) {
    const matches = await getRecentScoresForSport(sportKey);
    const teamMatches = matches.filter((m: any) =>
        (m.home_team?.includes(teamName) || teamName.includes(m.home_team)) ||
        (m.away_team?.includes(teamName) || teamName.includes(m.away_team))
    );
    const last5 = teamMatches.slice(-5);
    if (last5.length < 2) return { wins: 0, losses: 0, draws: 0, streak: 0, winRateDomicile: 0, winRateExterieur: 0, nbMatchsDomicile: 0, nbMatchsExterieur: 0 };

    let wins = 0, losses = 0, draws = 0, streak = 0;
    for (const m of last5) {
        const s1 = parseInt(m.scores?.[0]?.score) || 0;
        const s2 = parseInt(m.scores?.[1]?.score) || 0;
        const home = m.home_team?.includes(teamName) || teamName.includes(m.home_team);
        const teamScore = home ? s1 : s2;
        const oppScore = home ? s2 : s1;
        if (teamScore > oppScore) { wins++; streak = streak >= 0 ? streak + 1 : 1; }
        else if (teamScore < oppScore) { losses++; streak = streak <= 0 ? streak - 1 : -1; }
        else { draws++; streak = 0; }
    }

    const homeMatches = last5.filter((m: any) => m.home_team?.includes(teamName) || teamName.includes(m.home_team));
    const homeWins = homeMatches.filter((m: any) => (parseInt(m.scores?.[0]?.score) || 0) > (parseInt(m.scores?.[1]?.score) || 0)).length;
    const homeLosses = homeMatches.filter((m: any) => (parseInt(m.scores?.[0]?.score) || 0) < (parseInt(m.scores?.[1]?.score) || 0)).length;

    const awayMatches = last5.filter((m: any) => m.away_team?.includes(teamName) || teamName.includes(m.away_team));
    const awayWins = awayMatches.filter((m: any) => (parseInt(m.scores?.[1]?.score) || 0) > (parseInt(m.scores?.[0]?.score) || 0)).length;
    const awayLosses = awayMatches.filter((m: any) => (parseInt(m.scores?.[1]?.score) || 0) < (parseInt(m.scores?.[0]?.score) || 0)).length;

    return {
        wins, losses, draws, streak,
        winRateDomicile: homeMatches.length >= 2 ? (homeWins / homeMatches.length) * 100 : 0,
        winRateExterieur: awayMatches.length >= 2 ? (awayWins / awayMatches.length) * 100 : 0,
        nbMatchsDomicile: homeMatches.length,
        nbMatchsExterieur: awayMatches.length,
        invaincuDomicile: homeMatches.length >= 2 && homeLosses === 0,
    };
}

// ── Poisson simplifié ──
function poissonProba(moyButsEquipe: number, moyButsAdverse: number): number {
    const forceAtt = moyButsEquipe || 1.0;
    const forceDef = moyButsAdverse || 1.0;
    const expectedButs = (forceAtt + 1 / (forceDef || 0.1)) / 2;
    return Math.min(0.95, Math.max(0.1, expectedButs / 2.5));
}

// ── Indice de confiance ──
async function calculerConfiance(match: any, homeForm: any, awayForm: any, bookmakers: any[]) {
    let score = 70;
    const reasons: string[] = [];

    if (homeForm && awayForm) {
        const h2hMarket = bookmakers?.[0]?.markets?.find((m: any) => m.key === "h2h");
        if (h2hMarket && h2hMarket.outcomes.length >= 2) {
            const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === match.home_team);
            const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === match.away_team);
            if (homeOutcome && awayOutcome) {
                const favoriteIsHome = homeOutcome.price < awayOutcome.price;
                if (favoriteIsHome && homeForm.losses >= 3 && homeForm.nbMatchsDomicile >= 2) {
                    score -= 50; reasons.push("❌ Favori domicile a perdu 3+ sur 5");
                }
                if (!favoriteIsHome && awayForm.losses >= 3 && awayForm.nbMatchsExterieur >= 2) {
                    score -= 50; reasons.push("❌ Favori extérieur a perdu 3+ sur 5");
                }
                if (homeForm.invaincuDomicile && homeForm.nbMatchsDomicile >= 2) {
                    score += 15; reasons.push("🏠 Domicile invaincu");
                }
                if ((homeForm.streak || 0) <= -3) { score += 12; reasons.push("🎯 Extérieur en crise"); }
            }
        }
        if ((homeForm.streak || 0) >= 2) { score += 8; reasons.push("🏠 Domicile en forme"); }
        if ((awayForm.streak || 0) <= -2) { score += 5; reasons.push("❌ Extérieur en crise"); }
        if (homeForm.winRateDomicile >= 60) { score += 12; reasons.push("🏠 Domicile solide"); }
        if (awayForm.winRateExterieur <= 25 && awayForm.nbMatchsExterieur >= 2) { score += 8; reasons.push("🎯 Extérieur faible"); }
    }

    // Analyse Poisson
    const h2hMarketPoisson = bookmakers?.[0]?.markets?.find((m: any) => m.key === "h2h");
    if (h2hMarketPoisson && h2hMarketPoisson.outcomes.length >= 2 && homeForm && awayForm) {
        const homeOutcome = h2hMarketPoisson.outcomes.find((o: any) => o.name === match.home_team);
        const awayOutcome = h2hMarketPoisson.outcomes.find((o: any) => o.name === match.away_team);
        if (homeOutcome && awayOutcome) {
            const favoritePrice = Math.min(homeOutcome.price, awayOutcome.price);
            const probaCote = 1 / favoritePrice;
            const favoriteIsHome = homeOutcome.price < awayOutcome.price;
            const poissonFav = favoriteIsHome
                ? poissonProba(homeForm.winRateDomicile / 100 || 0.5, awayForm.winRateExterieur / 100 || 0.5)
                : poissonProba(awayForm.winRateExterieur / 100 || 0.5, homeForm.winRateDomicile / 100 || 0.5);
            if (probaCote > 0.65 && poissonFav < 0.40) { score -= 40; reasons.push("⚠️ Poisson désaccord"); }
            if (probaCote > 0.55 && poissonFav > 0.55) { score += 10; reasons.push("✅ Poisson confirmé"); }
        }
    }

    return { score: Math.min(100, Math.max(0, score)), reasons, passing: score >= 55 };
}

// ── Récupération des cotes ──
const MARKET_TIERS = [
    ["h2h", "totals", "spreads", "btts", "double_chance", "draw_no_bet"],
    ["h2h", "totals", "spreads", "btts", "double_chance"],
    ["h2h", "totals", "spreads"],
    ["h2h", "totals"],
    ["h2h"],
];

async function fetchOddsForSport(sportKey: string) {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;

    for (const markets of MARKET_TIERS) {
        try {
            const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`, {
                params: { apiKey: ODDS_API_KEY, regions: "eu", markets: markets.join(","), oddsFormat: "decimal", commenceTimeFrom: fmt(now), commenceTimeTo: fmt(in24h) },
            });
            if (response.data?.length > 0) return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message;
            if (msg.includes("quota") || msg.includes("Usage quota")) {
                console.error(`❌ Quota API épuisé pour ${sportKey}`);
                await log("error", `Quota API épuisé pour ${sportKey}`);
                throw new Error("QUOTA_EXCEEDED");
            }
        }
    }
    return [];
}

// ── Générateur avec anti-doublon global ──
function generateCombinés(predictions: any[], count: number, globalUsed: Set<string>) {
    const combinés: any[] = [];
    const sorted = [...predictions].sort((a, b) => (b.confiance || 0) - (a.confiance || 0));

    let attempts = 0;
    while (combinés.length < count && attempts < 3000) {
        attempts++;
        const selectionCount = Math.random() < 0.6 ? 2 : 3;
        const current: any[] = [];
        const usedLocal = new Set<string>();
        const usedSports = new Set<string>();
        let totalOdds = 1.0;
        let avgConf = 0;

        for (let i = 0; i < selectionCount; i++) {
            let pool = sorted.filter((b: any) => !usedLocal.has(b.match_id) && !globalUsed.has(b.match_id) && (i === 0 || !usedSports.has(b.sport_group)));
            if (pool.length === 0 && i > 0) pool = sorted.filter((b: any) => !usedLocal.has(b.match_id) && !globalUsed.has(b.match_id));
            if (pool.length === 0) break;

            const idx = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * Math.min(pool.length, 5));
            const sel = pool[idx];
            current.push(sel);
            usedLocal.add(sel.match_id);
            if (sel.sport_group) usedSports.add(sel.sport_group);
            totalOdds *= sel.cote;
            avgConf += sel.confiance || 0;
        }

        avgConf = current.length > 0 ? avgConf / current.length : 0;
        if (totalOdds >= 1.80 && totalOdds <= 2.50 && current.length >= 2 && current.length <= 3 && avgConf >= 55) {
            const ids = current.map((m: any) => m.match_id).sort().join("-");
            if (!combinés.some((c: any) => c.matchs.map((m: any) => m.match_id).sort().join("-") === ids)) {
                combinés.push({ cote_totale: parseFloat(totalOdds.toFixed(2)), confiance_moyenne: Math.round(avgConf), nb_sports: usedSports.size, sports: [...usedSports].join(", "), matchs: current });
                current.forEach((m: any) => globalUsed.add(m.match_id));
            }
        }
    }
    return combinés;
}

// ── GET (Vercel Cron appelle cette route) ──
export async function GET(request: NextRequest) {
    return POST(request);
}

// ── POST (appel manuel depuis admin / Vercel Cron) ──
export async function POST(request: NextRequest) {
    try {
        if (!isAuthorized(request)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        console.log("=== 🧠 Génération des Combinés (Vercel) ===");
        await log("info", "Début génération combinés");

        // 1. Nettoyage anciens combinés (3 jours)
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("combines_du_jour").delete().lt("created_at", threeDaysAgo);

        // 2. Récupérer les sports actifs
        const sportsResp = await axios.get("https://api.the-odds-api.com/v4/sports", { params: { apiKey: ODDS_API_KEY } });
        const activeSports = sportsResp.data.filter((s: any) => s.active).slice(0, 12);
        const sportsPriority = ["Soccer", "Basketball", "Baseball", "Ice Hockey", "American Football"];
        const ordered = [
            ...sportsPriority.flatMap((g: string) => activeSports.filter((s: any) => s.group === g)).slice(0, 8),
            ...activeSports.filter((s: any) => !sportsPriority.includes(s.group)).slice(0, 4),
        ];

        let allPredictions: any[] = [];

        for (const sport of ordered) {
            const matches = await fetchOddsForSport(sport.key);
            if (!matches || matches.length === 0) {
                console.log(`   Aucun match pour ${sport.name}`);
                continue;
            }

            for (const match of matches) {
                const { id, sport_title, home_team, away_team, commence_time, bookmakers } = match;
                if (!bookmakers?.length) continue;

                await delay(500); // Pause pour éviter de brûler le quota

                const homeForm = await analyserForme(home_team, sport.key);
                const awayForm = await analyserForme(away_team, sport.key);
                const conf = await calculerConfiance(match, homeForm, awayForm, bookmakers);
                if (!conf.passing) {
                    console.log(`   ⛔ ${home_team} vs ${away_team} rejeté (${conf.score}/100)`);
                    continue;
                }

                const usedBookmaker = bookmakers[0];
                for (const market of usedBookmaker.markets) {
                    if (sport.group === "Soccer") {
                        if (market.key === "double_chance") {
                            for (const outcome of market.outcomes) {
                                if (outcome.price >= 1.20 && outcome.price <= 1.50) {
                                    allPredictions.push({
                                        match_id: id, sport: sport_title, sport_group: sport.group,
                                        home_team, away_team, commence_at: commence_time,
                                        prediction: `Double chance : ${outcome.name}`,
                                        market: "double_chance", cote: outcome.price,
                                        type_pari: "double_chance", confiance: conf.score,
                                        value_bet: false,
                                    });
                                }
                            }
                        }
                        if (market.key === "totals") {
                            for (const outcome of market.outcomes) {
                                if (outcome.name === "Over" && (outcome.point === 1.5 || outcome.point === 2.5) && outcome.price >= 1.20 && outcome.price <= 1.60) {
                                    allPredictions.push({
                                        match_id: id, sport: sport_title, sport_group: sport.group,
                                        home_team, away_team, commence_at: commence_time,
                                        prediction: `Plus de ${outcome.point} buts`,
                                        market: "totals", cote: outcome.price,
                                        type_pari: "totaux", confiance: conf.score,
                                        value_bet: false,
                                    });
                                }
                            }
                        }
                        if (market.key === "btts") {
                            for (const outcome of market.outcomes) {
                                if (outcome.price >= 1.50 && outcome.price <= 1.80 && outcome.name === "No") {
                                    allPredictions.push({
                                        match_id: id, sport: sport_title, sport_group: sport.group,
                                        home_team, away_team, commence_at: commence_time,
                                        prediction: "BTTS : Non",
                                        market: "btts", cote: outcome.price,
                                        type_pari: "btts", confiance: conf.score,
                                        value_bet: false,
                                    });
                                }
                            }
                        }
                    } else if (sport.group === "Basketball" || sport.group === "Baseball") {
                        if (market.key === "spreads") {
                            for (const outcome of market.outcomes) {
                                if (outcome.point < 0 && outcome.price >= 1.30 && outcome.price <= 1.75) {
                                    allPredictions.push({
                                        match_id: id, sport: sport_title, sport_group: sport.group,
                                        home_team, away_team, commence_at: commence_time,
                                        prediction: `${outcome.name} gagne par +${Math.abs(outcome.point)}`,
                                        market: "spreads", cote: outcome.price,
                                        type_pari: "handicap", confiance: conf.score,
                                        value_bet: false,
                                    });
                                }
                            }
                        }
                    } else if (sport.group === "Ice Hockey") {
                        if (market.key === "h2h") {
                            for (const outcome of market.outcomes) {
                                if (outcome.price >= 1.35 && outcome.price <= 1.65 && outcome.name === home_team) {
                                    allPredictions.push({
                                        match_id: id, sport: sport_title, sport_group: sport.group,
                                        home_team, away_team, commence_at: commence_time,
                                        prediction: `Victoire ${outcome.name} (ML)`,
                                        market: "h2h", cote: outcome.price,
                                        type_pari: "moneyline_nhl", confiance: conf.score,
                                        value_bet: false,
                                    });
                                }
                            }
                        }
                    } else {
                        // fallback générique
                        if (market.key === "h2h") {
                            for (const outcome of market.outcomes) {
                                if (outcome.price >= 1.30 && outcome.price <= 1.70 && outcome.name === home_team) {
                                    allPredictions.push({
                                        match_id: id, sport: sport_title, sport_group: sport.group,
                                        home_team, away_team, commence_at: commence_time,
                                        prediction: `Victoire de ${outcome.name}`,
                                        market: "h2h", cote: outcome.price,
                                        type_pari: "resultat", confiance: conf.score,
                                        value_bet: false,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        console.log(`\n=== ${allPredictions.length} pronostics validés ===`);

        // 3. Génération avec anti-doublon global
        const globalUsed = new Set<string>();
        const combinés = generateCombinés(allPredictions, 10, globalUsed);
        console.log(`${combinés.length} combinés générés`);

        // 4. Insertion dans Supabase
        for (let i = 0; i < combinés.length; i++) {
            const c = combinés[i];
            const { data: combineData, error: combineError } = await supabase
                .from("combines_du_jour")
                .insert([{ nom_du_combine: `Combiné #${i + 1}`, cote_totale: c.cote_totale }])
                .select();

            if (combineError || !combineData) {
                console.error(`Erreur insertion combiné #${i + 1}:`, combineError?.message);
                continue;
            }

            const matchsToInsert = c.matchs.map((m: any) => ({
                combine_id: combineData[0].id,
                match_id: m.match_id,
                match_nom: `${m.home_team} vs ${m.away_team}`,
                sport: m.sport,
                home_team: m.home_team,
                away_team: m.away_team,
                commence_at: m.commence_at,
                prediction: m.prediction,
                option_pari: m.prediction,
                market: m.market,
                cote_pari: m.cote,
                cote: m.cote,
            }));

            const { error: matchsError } = await supabase.from("matchs_du_combine").insert(matchsToInsert);
            if (matchsError) console.error(`Erreur insertion matchs combiné #${i + 1}:`, matchsError.message);
        }

        await log("info", `Génération terminée : ${combinés.length} combinés créés`);

        return NextResponse.json({
            success: true,
            message: `${combinés.length} combinés générés avec succès !`,
            predictions_count: allPredictions.length,
            combines_count: combinés.length,
        });
    } catch (error: any) {
        console.error("Erreur génération:", error.message);
        await log("error", "Erreur génération combinés", { error: error.message });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}