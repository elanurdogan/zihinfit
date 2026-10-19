// Hafıza Matrisi (Memory Matrix esintili): kısa süre yanan kareleri hatırla.
// Feedback'e karşılık ("tek hatada tüm puan gidiyor"): her doğru kare puanını korur, tahta başına 1 hata hakkı vardır;
// adaptif seviye: kusursuz tahta → seviye atlar, hatalı ama tamamlanan → aynı kalır, başarısız → 1 seviye geri.

import { h } from '../core/dom.js';

const BOARDS = 12;
const MAX_MISTAKES = 2;

export function matrixLevel(level) {
    const size = level <= 2 ? 3 : level <= 5 ? 4 : level <= 8 ? 5 : 6;
    return { size, tiles: Math.min(size * size - 2, 2 + level) };
}

export default {
    id: 'hafiza-matrisi',
    title: 'Hafıza Matrisi',
    original: 'Memory Matrix',
    category: 'hafiza',
    icon: '🟦',
    description: 'Kısa süre yanan kareleri aklında tut ve aynılarını işaretle. Uzamsal çalışma belleğini geliştirir.',
    howTo: [
        'Izgaradaki bazı kareler bir an yanar. Yerlerini aklında tut.',
        'Kareler kapanınca yanan karelerin hepsine dokun.',
        'Her doğru kare puan kazandırır. Tahta başına 1 hata hakkın var; ikinci hatada tahta biter ama kazandığın puan kalır.',
        'Kusursuz tahtada seviye atlarsın; başarısız tahtada bir seviye geri inersin. Toplam 12 tahta.',
    ],
    controls: 'Tab ile kareler arasında gezin, Enter ile seç',
    scoreRef: 700,

    create(ctx) {
        const { stage, clock, rng } = ctx;
        let level = 1, maxLevel = 1, board = 0, score = 0, correctTaps = 0, wrongTaps = 0, perfect = 0;
        let targets = new Set(), found = 0, mistakes = 0, accepting = false;

        const info = h('p', { class: 'mx-info', 'aria-live': 'polite' });
        const grid = h('div', { class: 'mx-grid' });
        stage.append(info, grid);

        const updateHud = () => ctx.hud({ Skor: score, Seviye: level, Tahta: `${Math.min(board, BOARDS)}/${BOARDS}` });

        function newBoard() {
            if (board >= BOARDS) { ctx.finish(getResult()); return; }
            board++;
            const { size, tiles } = matrixLevel(level);
            targets = new Set(rng.sample(Array.from({ length: size * size }, (_, i) => i), tiles));
            found = 0;
            mistakes = 0;
            accepting = false;
            grid.style.setProperty('--size', size);
            grid.replaceChildren(...Array.from({ length: size * size }, (_, i) => h('button', {
                class: `mx-cell${targets.has(i) ? ' lit' : ''}`, 'aria-label': `Kare ${i + 1}`, disabled: true, onclick: e => tap(e.currentTarget, i),
            })));
            info.textContent = `${tiles} kareyi aklında tut…`;
            updateHud();
            clock.after(1000 + tiles * 120, () => {
                grid.querySelectorAll('.mx-cell').forEach(cell => { cell.classList.remove('lit'); cell.disabled = false; });
                info.textContent = `Yanan ${tiles} kareye dokun (1 hata hakkın var)`;
                accepting = true;
            });
        }

        function tap(cell, i) {
            if (!accepting || cell.classList.contains('hit') || cell.classList.contains('miss')) return;
            cell.disabled = true;
            if (targets.has(i)) {
                cell.classList.add('hit');
                found++;
                correctTaps++;
                score += 10;
                ctx.sound('tick');
                if (found === targets.size) endBoard(true);
            } else {
                cell.classList.add('miss');
                mistakes++;
                wrongTaps++;
                ctx.sound('wrong');
                if (mistakes >= MAX_MISTAKES) endBoard(false);
                else info.textContent = 'Bir hata! Son hakkın kaldı.';
            }
            updateHud();
        }

        function endBoard(completed) {
            accepting = false;
            grid.querySelectorAll('.mx-cell').forEach((cell, i) => {
                cell.disabled = true;
                if (targets.has(i) && !cell.classList.contains('hit')) cell.classList.add('reveal');
            });
            if (completed && mistakes === 0) {
                perfect++;
                score += 20;
                level++;
                maxLevel = Math.max(maxLevel, level);
                info.textContent = 'Kusursuz! +20 · Seviye atladın';
                ctx.flash('good');
            } else if (completed) {
                info.textContent = 'Tamamlandı. Aynı seviyede devam.';
                ctx.flash('good');
            } else {
                level = Math.max(1, level - 1);
                info.textContent = `Tahta bitti; ${found} kareyi buldun, puanın korundu.`;
                ctx.flash('bad');
            }
            updateHud();
            clock.after(1300, newBoard);
        }

        function getResult() {
            return {
                score,
                accuracy: correctTaps + wrongTaps ? correctTaps / (correctTaps + wrongTaps) : 0,
                level: maxLevel,
                details: [['Kusursuz tahta', `${perfect} / ${Math.min(board, BOARDS)}`], ['Doğru kare', correctTaps], ['Yanlış kare', wrongTaps]],
            };
        }

        return {
            start() { newBoard(); },
            getResult,
            debug: () => ({ targets: [...targets], accepting }),
        };
    },
};
