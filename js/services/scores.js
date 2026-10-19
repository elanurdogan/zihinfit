// Kalıcı skor ve ilerleme kaydı. Her oyun için en iyi sonuç, oynanma sayısı ve son 50 sonuç tutulur.

const HISTORY_LIMIT = 50;
const EMPTY = () => ({ best: null, plays: 0, history: [] });

export function createScoreService(storage) {
    const load = () => storage.get('scores', {});

    return {
        record(gameId, entry) {
            const all = load();
            const stats = all[gameId] || EMPTY();
            const previousBest = stats.best;
            const isBest = !previousBest || entry.score > previousBest.score;
            stats.plays++;
            stats.history.push(entry);
            if (stats.history.length > HISTORY_LIMIT) stats.history = stats.history.slice(-HISTORY_LIMIT);
            if (isBest) stats.best = entry;
            all[gameId] = stats;
            storage.set('scores', all);
            return { isBest: isBest && stats.plays > 1, firstPlay: stats.plays === 1, previousBest, stats };
        },
        stats: gameId => load()[gameId] || EMPTY(),
        all: load,
    };
}
