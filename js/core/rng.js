// Tohumlanabilir rastgele sayı üreteci (mulberry32). Aynı tohum aynı oyunu üretir; testler buna dayanır.

export function hashSeed(text) {
    let hash = 1779033703 ^ text.length;
    for (let i = 0; i < text.length; i++) {
        hash = Math.imul(hash ^ text.charCodeAt(i), 3432918353);
        hash = (hash << 13) | (hash >>> 19);
    }
    return hash >>> 0;
}

export function createRng(seed = Date.now()) {
    let state = (typeof seed === 'string' ? hashSeed(seed) : seed) >>> 0;

    function next() {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    const int = (min, max) => min + Math.floor(next() * (max - min + 1));
    const pick = list => list[int(0, list.length - 1)];
    const chance = p => next() < p;
    function shuffle(list) {
        const copy = list.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = int(0, i);
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }
    const sample = (list, n) => shuffle(list).slice(0, n);

    return { next, int, pick, chance, shuffle, sample };
}
