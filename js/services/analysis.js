// Bilişsel profil. Her oyunun sonucu 0–100 arasına normalize edilir; kategoriler oyun tanımında açıkça yazılıdır.
// Bir oyunun değeri son 5 sonucunun ortalamasıdır, kategori değeri oynanan oyunlarının ortalamasıdır.

const RECENT = 5;
const average = list => list.reduce((a, b) => a + b, 0) / list.length;
const clamp100 = n => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

export function normalizeResult(def, result) {
    return clamp100(def.normalize ? def.normalize(result) : (result.score / def.scoreRef) * 100);
}

export function buildProfile({ games, categories, scoresAll }) {
    const gameRows = games.map(game => {
        const stats = scoresAll[game.id];
        const recent = (stats?.history || []).slice(-RECENT).map(entry => entry.normalized).filter(Number.isFinite);
        return {
            id: game.id,
            title: game.title,
            icon: game.icon,
            category: game.category,
            plays: stats?.plays || 0,
            best: stats?.best?.score ?? null,
            value: recent.length ? Math.round(average(recent)) : null,
        };
    });

    const categoryRows = categories.map(cat => {
        const rows = gameRows.filter(row => row.category === cat.key);
        const values = rows.filter(row => row.value != null).map(row => row.value);
        return { ...cat, value: values.length ? Math.round(average(values)) : null, played: values.length, total: rows.length };
    });

    const scored = categoryRows.filter(cat => cat.value != null);
    const byValue = [...scored].sort((a, b) => b.value - a.value);
    return {
        games: gameRows,
        categories: categoryRows,
        overall: scored.length ? Math.round(average(scored.map(cat => cat.value))) : null,
        strongest: byValue.length >= 2 ? byValue[0] : null,
        weakest: byValue.length >= 2 && byValue[0].value !== byValue[byValue.length - 1].value ? byValue[byValue.length - 1] : null,
        playedGames: gameRows.filter(row => row.plays > 0).length,
        coveredCategories: scored.length,
    };
}
