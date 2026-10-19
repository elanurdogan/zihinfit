// Hafıza Eşleştirme (Memory Match): kart çiftlerini bul.
// Feedback'e karşılık: her bulunan çift puanını korur (tek hatada puan silinmez); verimli bitirilen tahtada
// kart sayısı artar (adaptif seviye); Zen modunda süre yoktur.

import { h } from '../core/dom.js';

const ICONS = ['🚀', '⭐', '🎈', '🎨', '🎯', '🎸', '🍀', '🐢', '🌙', '⚓', '🔔', '🍉'];
const BOARD_PAIRS = [3, 4, 6, 8, 10];
const SESSION_SECONDS = 90;

export default {
    id: 'hafiza-eslestirme',
    title: 'Hafıza Eşleştirme',
    original: 'Memory Match',
    category: 'hafiza',
    icon: '🃏',
    description: 'Kartları çevir, aynı simgeleri eşleştir. Kısa süreli görsel hafızanı çalıştırır.',
    howTo: [
        'Bir karta dokun, simgesini gör. Sonra eşini bulmak için ikinci karta dokun.',
        'Simgeler aynıysa çift açık kalır ve puan kazanırsın; değilse kartlar kapanır.',
        'Az hamleyle biten tahtadan sonra tahta büyür. Bulduğun her çift puanını korur.',
        '90 saniye boyunca olabildiğince çok çift bul.',
    ],
    controls: 'Tab ile kartlar arasında gezin, Enter ile çevir',
    scoreRef: 500,
    supportsZen: true,

    create(ctx) {
        const { stage, clock, rng } = ctx;
        let level = 1, score = 0, pairsFound = 0, moves = 0, boards = 0;
        let boardMoves = 0, boardPairs = 0, boardFound = 0, first = null, lock = false;

        const grid = h('div', { class: 'mm-grid' });
        stage.append(grid);

        const updateHud = () => ctx.hud({ Skor: score, Seviye: level, Çift: pairsFound });

        function newBoard() {
            boardPairs = BOARD_PAIRS[Math.min(level, BOARD_PAIRS.length) - 1];
            boardMoves = 0;
            boardFound = 0;
            first = null;
            lock = false;
            const icons = rng.sample(ICONS, boardPairs);
            const cols = boardPairs * 2 <= 6 ? 3 : boardPairs * 2 <= 16 ? 4 : 5;
            grid.style.setProperty('--cols', cols);
            grid.replaceChildren(...rng.shuffle([...icons, ...icons]).map(icon => {
                const card = h('button', { class: 'mm-card', 'aria-label': 'Kapalı kart', onclick: () => flip(card) },
                    h('span', { class: 'mm-face', 'aria-hidden': 'true' }, icon));
                card.icon = icon;
                return card;
            }));
        }

        function reveal(card, open) {
            card.classList.toggle('open', open);
            card.setAttribute('aria-label', open ? `Kart: ${card.icon}` : 'Kapalı kart');
        }

        function flip(card) {
            if (lock || card === first || card.classList.contains('matched')) return;
            reveal(card, true);
            if (!first) { first = card; return; }
            const second = card;
            moves++;
            boardMoves++;
            if (first.icon === second.icon) {
                [first, second].forEach(c => { c.classList.add('matched'); c.disabled = true; });
                first = null;
                pairsFound++;
                boardFound++;
                score += 10;
                ctx.sound('correct');
                if (boardFound === boardPairs) boardDone();
            } else {
                lock = true;
                const a = first;
                first = null;
                ctx.sound('wrong');
                clock.after(750, () => {
                    reveal(a, false);
                    reveal(second, false);
                    lock = false;
                });
            }
            updateHud();
        }

        function boardDone() {
            boards++;
            const efficient = boardMoves <= Math.ceil(boardPairs * 1.6) + 1;
            score += Math.max(0, (boardPairs * 2 - (boardMoves - boardPairs)) * 2);
            if (efficient && level < BOARD_PAIRS.length) {
                level++;
                ctx.announce(`Tahta büyüyor: ${BOARD_PAIRS[level - 1]} çift`);
            }
            ctx.flash('good');
            lock = true;
            clock.after(600, newBoard);
        }

        function getResult() {
            return {
                score,
                accuracy: moves ? pairsFound / moves : 0,
                level,
                details: [['Bulunan çift', pairsFound], ['Hamle', moves], ['Tamamlanan tahta', boards]],
            };
        }

        return {
            start() {
                updateHud();
                ctx.countdown(SESSION_SECONDS, () => { lock = true; ctx.finish(getResult()); });
                newBoard();
            },
            getResult,
            debug: () => ({ icons: [...grid.children].map(card => card.icon) }),
        };
    },
};
