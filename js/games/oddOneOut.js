// Detay Avcısı: aynı simgeler arasında farklı olanı bul (seçici dikkat).
// Feedback'e karşılık (Star Search: "yanlışlıkla bitişikteki şekli seçiyor"): her hücre aralıklı, tam boy bir butondur;
// seçim click ile (parmak aynı hücrede kalkınca) olur; ızgara en büyük hâlinde bile 44 px üstü hedef bırakır.

import { h } from '../core/dom.js';

const SESSION_SECONDS = 60;
const PAIRS = [
    ['X', 'O'], ['T', 'L'], ['A', 'H'],                 // kolay
    ['E', 'F'], ['P', 'R'], ['C', 'G'], ['M', 'N'],     // orta
    ['b', 'd'], ['p', 'q'], ['O', 'Q'], ['u', 'ü'], ['c', 'ç'], ['g', 'ğ'], ['o', 'ö'], // zor
];
const TIERS = [[0, 3], [3, 7], [7, PAIRS.length]];

export default {
    id: 'detay-avcisi',
    title: 'Detay Avcısı',
    original: 'Star Search',
    category: 'dikkat',
    icon: '🔍',
    description: 'Birbirine çok benzeyen işaretler arasında farklı olanı bul. Seçici dikkat ve görsel ayrım.',
    howTo: [
        'Izgaradaki işaretlerin hepsi aynı; yalnızca biri farklı.',
        'Farklı olana dokun. Doğru bulduğunda yeni ızgara gelir.',
        'Seviye arttıkça ızgara büyür ve işaretler birbirine daha çok benzer (b/d, ç/c…).',
        'Yanlış dokunuş 5 puan ve 2 saniye götürür. 60 saniyen var.',
    ],
    controls: 'Tab ile hücreler arasında gezin, Enter ile seç',
    scoreRef: 400,
    supportsZen: true,

    create(ctx) {
        const { stage, clock, rng, zen } = ctx;
        let level = 1, score = 0, hits = 0, misses = 0, oddIndex = -1, accepting = false, timer = null;

        const grid = h('div', { class: 'oo-grid' });
        stage.append(h('p', { class: 'oo-info' }, 'Farklı olan işareti bul'), grid);
        const updateHud = () => ctx.hud({ Skor: score, Seviye: level });

        function newGrid() {
            const size = level <= 1 ? 3 : level <= 3 ? 4 : level <= 5 ? 5 : 6;
            const [from, to] = TIERS[level <= 2 ? 0 : level <= 4 ? 1 : 2];
            let [common, odd] = PAIRS[rng.int(from, to - 1)];
            if (rng.chance(0.5)) [common, odd] = [odd, common];
            oddIndex = rng.int(0, size * size - 1);
            grid.style.setProperty('--size', size);
            grid.replaceChildren(...Array.from({ length: size * size }, (_, i) => h('button', {
                class: 'oo-cell', 'aria-label': `Hücre ${i + 1}: ${i === oddIndex ? odd : common}`, onclick: e => tap(e.currentTarget, i),
            }, i === oddIndex ? odd : common)));
            accepting = true;
        }

        function tap(cell, i) {
            if (!accepting) return;
            if (i === oddIndex) {
                accepting = false;
                hits++;
                score += 10 + level * 2;
                if (hits % 2 === 0 && level < 8) level++;
                cell.classList.add('found');
                ctx.flash('good');
                clock.after(250, newGrid);
            } else {
                misses++;
                score = Math.max(0, score - 5);
                timer?.add(-2);
                cell.classList.remove('shake');
                void cell.offsetWidth;
                cell.classList.add('shake');
                ctx.flash('bad');
            }
            updateHud();
        }

        function getResult() {
            return {
                score,
                accuracy: hits + misses ? hits / (hits + misses) : 0,
                level,
                details: [['Bulunan', hits], ['Yanlış dokunuş', misses]],
            };
        }

        return {
            start() {
                updateHud();
                timer = ctx.countdown(SESSION_SECONDS, () => { accepting = false; ctx.finish(getResult()); });
                if (zen) timer = null;
                newGrid();
            },
            getResult,
            debug: () => ({ oddIndex }),
        };
    },
};
