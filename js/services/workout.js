// Günlük antrenman: her kategoriden bir oyun. Kullanıcı istediği oyunu aynı kategorideki başka bir oyunla
// değiştirebilir. Son günlerde antrenmana gelen oyunlar mümkünse tekrar seçilmez, az oynananlar öne çıkar.
// Seçim mantığı saf fonksiyonlardır (birim testli); servis yalnızca saklama işini yapar.

import { createRng } from '../core/rng.js';

const AVOID_DAYS = 2;
const KEEP_DAYS = 14;

export function todayKey(date = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function pickForCategory(pool, { rng, avoid = new Set(), exclude = new Set(), playCounts = {} }) {
    let candidates = pool.filter(game => !exclude.has(game.id));
    const fresh = candidates.filter(game => !avoid.has(game.id));
    if (fresh.length) candidates = fresh;
    if (!candidates.length) return null;
    const minPlays = Math.min(...candidates.map(game => playCounts[game.id] || 0));
    return rng.pick(candidates.filter(game => (playCounts[game.id] || 0) === minPlays));
}

export function buildWorkout({ games, categories, rng, recentGameIds = [], playCounts = {} }) {
    const avoid = new Set(recentGameIds);
    return categories
        .map(cat => pickForCategory(games.filter(game => game.category === cat.key), { rng, avoid, playCounts }))
        .filter(Boolean)
        .map(game => game.id);
}

export function swapGame({ workoutIds, index, games, rng, recentGameIds = [], playCounts = {} }) {
    const current = games.find(game => game.id === workoutIds[index]);
    if (!current) return null;
    const pool = games.filter(game => game.category === current.category);
    const pick = pickForCategory(pool, { rng, avoid: new Set(recentGameIds), exclude: new Set(workoutIds), playCounts });
    return pick ? pick.id : null;
}

export function createWorkoutService({ storage, games, categories, scores, seed = null }) {
    const validIds = new Set(games.map(game => game.id));
    const rngFor = key => createRng(seed ? `${seed}:${key}` : `${key}:${Date.now()}:${Math.random()}`);

    const load = () => storage.get('workouts', {});
    function save(all) {
        const keys = Object.keys(all).sort().slice(-KEEP_DAYS);
        storage.set('workouts', Object.fromEntries(keys.map(key => [key, all[key]])));
    }
    function recentIds(all, key) {
        return Object.keys(all).filter(day => day < key).sort().slice(-AVOID_DAYS)
            .flatMap(day => all[day].slots.map(slot => slot.gameId));
    }
    function playCounts() {
        return Object.fromEntries(Object.entries(scores.all()).map(([id, stats]) => [id, stats.plays]));
    }
    function ensureToday() {
        const key = todayKey();
        const all = load();
        const today = all[key];
        const valid = today && today.slots.length === categories.length && today.slots.every(slot => validIds.has(slot.gameId));
        if (!valid) {
            const ids = buildWorkout({ games, categories, rng: rngFor(key), recentGameIds: recentIds(all, key), playCounts: playCounts() });
            all[key] = { slots: ids.map(gameId => ({ gameId, done: false, normalized: null })) };
            save(all);
        }
        return { key, all };
    }

    return {
        today() {
            const { key, all } = ensureToday();
            return { date: key, slots: all[key].slots };
        },
        swap(index) {
            const { key, all } = ensureToday();
            const slots = all[key].slots;
            if (!slots[index] || slots[index].done) return null;
            const newId = swapGame({
                workoutIds: slots.map(slot => slot.gameId), index, games,
                rng: rngFor(`${key}:swap:${index}:${slots[index].gameId}`), recentGameIds: recentIds(all, key), playCounts: playCounts(),
            });
            if (newId) {
                slots[index] = { gameId: newId, done: false, normalized: null };
                save(all);
            }
            return newId;
        },
        markDone(index, gameId, normalized) {
            const { key, all } = ensureToday();
            const slot = all[key].slots[index];
            if (!slot || slot.gameId !== gameId) return;
            slot.done = true;
            slot.normalized = Math.max(slot.normalized ?? 0, normalized);
            save(all);
        },
        nextIndex() {
            const index = this.today().slots.findIndex(slot => !slot.done);
            return index === -1 ? null : index;
        },
    };
}
