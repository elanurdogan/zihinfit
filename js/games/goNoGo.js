// Dur-Geç (go/no-go): yeşil daireye hemen bas, kırmızı çarpıya basma. Tepki hızı ve dürtü kontrolü.
// Renk körlüğü: hedefler yalnızca renkle değil şekil ve yazıyla da ayrılır (● GEÇ / ✕ DUR).

import { h } from '../core/dom.js';

const TRIALS = 30;
const GO_RATE = 0.7;

export default {
    id: 'dur-gec',
    title: 'Dur-Geç',
    original: 'Go / No-Go',
    category: 'hiz',
    icon: '🚦',
    description: '"GEÇ" işaretine olabildiğince hızlı bas, "DUR" işaretinde kendini tut. Tepki hızı ve dürtü kontrolü.',
    howTo: [
        'Ortadaki büyük alana odaklan.',
        '● GEÇ (yeşil daire) çıkınca hemen alana dokun ya da Boşluk tuşuna bas. Ne kadar hızlı, o kadar puan.',
        '✕ DUR (kırmızı çarpı) çıkınca hiçbir şeye basma.',
        'İşaret çıkmadan basmak "erken" sayılır. Toplam 30 deneme.',
    ],
    controls: 'Boşluk tuşu',
    scoreRef: 1400,
    // Puan: doğruluk %60, hız %40 (ortalama tepki 300 ms → tam, 750 ms → sıfır)
    normalize: r => 100 * (0.6 * (r.accuracy || 0) + 0.4 * (r.avgRt ? Math.max(0, Math.min(1, (750 - r.avgRt) / 450)) : 0)),

    create(ctx) {
        const { stage, clock, rng } = ctx;
        let trial = 0, score = 0, correct = 0, misses = 0, falseAlarms = 0, early = 0;
        let phase = 'idle', isGo = false, shownAt = 0, cancel = null;
        const rts = [];

        const feedback = h('p', { class: 'gng-feedback', 'aria-live': 'polite' }, 'Hazır ol…');
        const pad = h('button', { class: 'gng-pad', 'aria-label': 'Tepki alanı', onclick: press }, h('span', { class: 'gng-sign' }, '+'));
        stage.append(pad, feedback);
        const sign = pad.firstChild;

        const updateHud = () => ctx.hud({ Skor: score, Deneme: `${Math.min(trial, TRIALS)}/${TRIALS}` });

        function nextTrial() {
            if (trial >= TRIALS) { ctx.finish(getResult()); return; }
            trial++;
            phase = 'wait';
            pad.className = 'gng-pad';
            sign.textContent = '+';
            updateHud();
            cancel = clock.after(rng.int(600, 1600), showStimulus);
        }

        function showStimulus() {
            isGo = rng.chance(GO_RATE);
            phase = 'stimulus';
            shownAt = clock.now;
            pad.className = `gng-pad ${isGo ? 'go' : 'nogo'}`;
            sign.textContent = isGo ? '● GEÇ' : '✕ DUR';
            const windowMs = trial > 15 ? 750 : 1000;
            cancel = clock.after(windowMs, () => resolve(false));
        }

        function press() {
            if (phase === 'wait') {
                cancel?.();
                early++;
                score = Math.max(0, score - 10);
                feedback.textContent = 'Erken bastın! İşareti bekle.';
                ctx.flash('bad');
                endTrial();
            } else if (phase === 'stimulus') {
                cancel?.();
                resolve(true);
            }
        }

        function resolve(pressed) {
            if (phase !== 'stimulus') return;
            if (isGo && pressed) {
                const rt = Math.round(clock.now - shownAt);
                rts.push(rt);
                correct++;
                const gained = Math.max(5, Math.round((1000 - rt) / 10));
                score += gained;
                feedback.textContent = `${rt} ms · +${gained}`;
                ctx.flash('good');
            } else if (isGo) {
                misses++;
                feedback.textContent = 'Kaçırdın!';
                ctx.flash('bad');
            } else if (pressed) {
                falseAlarms++;
                score = Math.max(0, score - 20);
                feedback.textContent = 'DUR demişti! −20';
                ctx.flash('bad');
            } else {
                correct++;
                score += 10;
                feedback.textContent = 'Güzel, kendini tuttun! +10';
                ctx.sound('correct');
            }
            endTrial();
        }

        function endTrial() {
            phase = 'feedback';
            updateHud();
            clock.after(500, nextTrial);
        }

        function getResult() {
            const done = Math.max(1, trial - (phase === 'wait' ? 1 : 0));
            const avgRt = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : null;
            return {
                score,
                accuracy: correct / done,
                avgRt,
                details: [['Ortalama tepki', avgRt ? `${avgRt} ms` : '—'], ['Kaçırılan GEÇ', misses], ['Yanlış basış (DUR)', falseAlarms], ['Erken basış', early]],
            };
        }

        ctx.onKey(event => {
            if (event.key === ' ' || event.key === 'Enter') { press(); return true; }
            return false;
        });

        return {
            start() {
                updateHud();
                clock.after(800, nextTrial);
            },
            getResult,
            debug: () => ({ phase, isGo }),
        };
    },
};
