// Kartal Gözü (Eagle Eye esintili): sayıları sırayla bul.
// Feedback'e karşılık: Zen/pratik modu (süre yok, skor kaydedilmez); eşleşen sayıya tekrar dokunmak ceza vermez;
// yanlış dokunuş tüm ilerlemeyi silmez, yalnızca küçük bir puan düşer.

import { h } from '../core/dom.js';

const SESSION_SECONDS = 60;

export default {
    id: 'kartal-gozu',
    title: 'Kartal Gözü',
    original: 'Eagle Eye',
    category: 'hiz',
    icon: '🦅',
    description: 'Dağınık sayıları küçükten büyüğe (bazen büyükten küçüğe) en hızlı şekilde sırala. Görsel tarama hızını geliştirir.',
    howTo: [
        'Ekrandaki sayılara istenen sırayla dokun: önce en küçüğü, sonra bir sonrakini…',
        'Tahta bitince yenisi gelir. Hatasız biten her tahta seviyeni yükseltir: daha çok sayı, daha geniş aralık.',
        'İleri seviyelerde bazen "BÜYÜKTEN küçüğe" istenir; talimata dikkat.',
        'Yanlış dokunuş 5 puan düşürür ama tahtadaki ilerlemen kalır. 60 saniyen var.',
    ],
    controls: 'Tab ile sayılar arasında gezin, Enter ile seç',
    scoreRef: 450,
    supportsZen: true,

    create(ctx) {
        const { stage, clock, rng, zen } = ctx;
        let level = 1, score = 0, hits = 0, misses = 0, boards = 0;
        let order = [], nextIdx = 0, mistakeOnBoard = false, descending = false, accepting = false;

        const instruction = h('p', { class: 'ee-instruction', 'aria-live': 'polite' });
        const grid = h('div', { class: 'ee-grid' });
        stage.append(instruction, grid);

        const updateHud = () => ctx.hud({ Skor: score, Seviye: level });

        function newBoard() {
            const count = level <= 2 ? 6 : level <= 4 ? 9 : 12;
            const max = Math.min(99, 12 + level * 8);
            const numbers = rng.sample(Array.from({ length: max }, (_, i) => i + 1), count);
            descending = level >= 4 && rng.chance(0.4);
            order = [...numbers].sort((a, b) => (descending ? b - a : a - b));
            nextIdx = 0;
            mistakeOnBoard = false;
            instruction.replaceChildren(h('b', {}, descending ? 'BÜYÜKTEN küçüğe' : 'Küçükten BÜYÜĞE'), ' sırayla dokun');
            grid.className = `ee-grid ee-cols-${count === 6 ? 3 : count === 9 ? 3 : 4}`;
            grid.replaceChildren(...numbers.map(n => h('button', { class: 'ee-num', onclick: e => tap(e.currentTarget, n) }, n)));
            accepting = true;
        }

        function tap(btn, n) {
            if (!accepting || btn.classList.contains('done')) return;
            if (n === order[nextIdx]) {
                btn.classList.add('done');
                btn.disabled = true;
                nextIdx++;
                hits++;
                score += 2;
                if (nextIdx === order.length) {
                    accepting = false;
                    boards++;
                    score += order.length * 3;
                    if (!mistakeOnBoard) level++;
                    ctx.flash('good');
                    clock.after(350, newBoard);
                } else ctx.sound('tick');
            } else {
                misses++;
                mistakeOnBoard = true;
                score = Math.max(0, score - 5);
                btn.classList.remove('shake');
                void btn.offsetWidth;
                btn.classList.add('shake');
                ctx.flash('bad');
            }
            updateHud();
        }

        function getResult() {
            return {
                score,
                accuracy: hits + misses ? hits / (hits + misses) : 0,
                level,
                details: [['Tamamlanan tahta', boards], ['Yanlış dokunuş', misses]],
            };
        }

        return {
            start() {
                updateHud();
                ctx.countdown(SESSION_SECONDS, () => { accepting = false; ctx.finish(getResult()); });
                newBoard();
            },
            getResult,
            debug: () => ({ order: order.slice(nextIdx) }),
        };
    },
};
