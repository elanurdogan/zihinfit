// Süreli soru-cevap oyunları için ortak akış: Sayı Fırtınası, Renk Çatışması, Kural Değiştir,
// Zihinsel Döndürme ve Sürekli Dikkat bunu kullanır. Oyun yalnızca soruyu çizer ve cevabı bildirir;
// puan, çarpan, seviye, süre, tepki süresi ve istatistik burada tutulur.

export function createMultiplier(step = 5, max = 4) {
    let streak = 0;
    return {
        hit() { streak++; return Math.min(max, 1 + Math.floor((streak - 1) / step)); },
        miss() { streak = 0; },
        get value() { return Math.min(max, 1 + Math.floor(streak / step)); },
        get streak() { return streak; },
    };
}

export function createTrialSession(ctx, { seconds = 60, base = 10, responseMs = 0, levelEvery = 6, maxLevel = 6, render, details }) {
    const stats = { hits: 0, misses: 0, timeouts: 0, rts: [], level: 1, score: 0 };
    const multiplier = createMultiplier();
    let current = null, shownAt = 0, accepting = false, ended = false, cancelTimeout = null;

    function updateHud() {
        ctx.hud({ Skor: stats.score, Çarpan: `×${multiplier.value}`, Seviye: stats.level });
    }

    function next() {
        if (ended) return;
        current = render(stats.level);
        shownAt = ctx.clock.now;
        accepting = true;
        if (responseMs) cancelTimeout = ctx.clock.after(typeof responseMs === 'function' ? responseMs(stats.level) : responseMs, () => resolve(undefined, true));
    }

    function resolve(value, timedOut = false) {
        if (!accepting || ended) return;
        accepting = false;
        cancelTimeout?.();
        cancelTimeout = null;
        const correct = !timedOut && value === current.answer;
        if (correct) {
            stats.hits++;
            stats.rts.push(ctx.clock.now - shownAt);
            stats.score += base * multiplier.hit();
            if (stats.hits % levelEvery === 0 && stats.level < maxLevel) {
                stats.level++;
                ctx.announce(`Seviye ${stats.level}`);
            }
            ctx.flash('good');
        } else {
            if (timedOut) stats.timeouts++; else stats.misses++;
            multiplier.miss();
            ctx.flash('bad');
        }
        updateHud();
        current.onResult?.(correct, timedOut);
        ctx.clock.after(correct ? 250 : 700, next);
    }

    function result() {
        const answered = stats.hits + stats.misses + stats.timeouts;
        const avgRt = stats.rts.length ? Math.round(stats.rts.reduce((a, b) => a + b, 0) / stats.rts.length) : null;
        return {
            score: stats.score,
            accuracy: answered ? stats.hits / answered : 0,
            level: stats.level,
            avgRt,
            details: [
                ['Doğru', stats.hits],
                ['Yanlış', stats.misses],
                ...(responseMs ? [['Kaçırılan', stats.timeouts]] : []),
                ['Ortalama tepki', avgRt == null ? '—' : `${avgRt} ms`],
                ...(details ? details() : []),
            ],
        };
    }

    return {
        stats,
        get accepting() { return accepting; },
        start() {
            updateHud();
            ctx.countdown(seconds, () => { ended = true; accepting = false; ctx.finish(result()); });
            next();
        },
        answer: value => resolve(value),
        result,
    };
}
