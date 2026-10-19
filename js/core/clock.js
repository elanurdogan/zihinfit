// Oyuna özel zamanlayıcı. Tüm sayaçlar, gecikmeler ve animasyon kareleri buradan kurulur:
// - duraklatınca hepsi birlikte durur (sanal zaman ilerlemez),
// - destroy() ile hepsi tek seferde temizlenir; interval sızıntısı yapısal olarak imkânsız hale gelir.
// Tek bir requestAnimationFrame döngüsüyle çalışır; testlerde tick(dt) ile elle sürülebilir.

const MAX_FRAME_MS = 100; // sekme arka plandan dönünce dev bir sıçrama olmasın

export function createClock({ requestFrame = globalThis.requestAnimationFrame?.bind(globalThis), cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis) } = {}) {
    let time = 0, paused = false, destroyed = false, last = null, frameId = null, seq = 0;
    const timers = new Map();
    const frameFns = new Set();

    function tick(dt) {
        if (paused || destroyed) return;
        time += dt;
        // Vadesi gelen zamanlayıcıları sırayla çalıştır (bir zamanlayıcı yenisini kurabilir)
        for (;;) {
            let dueId = null, due = null;
            for (const [id, timer] of timers) {
                if (timer.at <= time && (!due || timer.at < due.at)) { dueId = id; due = timer; }
            }
            if (!due) break;
            if (due.every) due.at += due.every; else timers.delete(dueId);
            due.fn();
            if (destroyed || paused) return;
        }
        for (const fn of [...frameFns]) {
            fn(dt);
            if (destroyed || paused) return;
        }
    }

    function loop(timestamp) {
        frameId = null;
        if (destroyed) return;
        const dt = last == null ? 0 : Math.min(MAX_FRAME_MS, timestamp - last);
        last = timestamp;
        tick(dt);
        if (!destroyed) frameId = requestFrame(loop);
    }

    function ensureLoop() {
        if (requestFrame && frameId == null && !destroyed) { last = null; frameId = requestFrame(loop); }
    }

    function addTimer(ms, fn, every) {
        if (destroyed) return () => {};
        const id = ++seq;
        timers.set(id, { at: time + ms, fn, every });
        ensureLoop();
        return () => timers.delete(id);
    }

    return {
        get now() { return time; },
        get paused() { return paused; },
        after: (ms, fn) => addTimer(ms, fn, 0),
        every: (ms, fn) => addTimer(ms, fn, Math.max(1, ms)),
        onFrame(fn) {
            if (destroyed) return () => {};
            frameFns.add(fn);
            ensureLoop();
            return () => frameFns.delete(fn);
        },
        pause() { paused = true; },
        resume() { paused = false; last = null; },
        destroy() {
            destroyed = true;
            timers.clear();
            frameFns.clear();
            if (frameId != null && cancelFrame) cancelFrame(frameId);
            frameId = null;
        },
        tick,
    };
}
