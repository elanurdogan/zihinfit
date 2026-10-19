// Sayı Füzyonu (Fuse Clues esintili).
// Feedback'e karşılık: her soruda tek doğru çift garanti edilir ve doğrulayıcı seçilen çiftin sonucuna bakar
// (hedefe ulaşan her çift doğrudur); ulaşılan seviye kaydedilir ve sonraki oyunda oradan devam edilebilir;
// ipucu jokeri var; yanlış cevapta doğru çift gösterilir; seçim geri alınabilir.

import { h, hearts } from '../core/dom.js';
import { applyOp, generateFusePuzzle } from './logic/fuse.js';

const HINTS = 3;
const OP_TEXT = { sum: ['Toplamı', '+'], multiply: ['Çarpımı', '×'] };

export default {
    id: 'sayi-fuzyonu',
    title: 'Sayı Füzyonu',
    original: 'Fuse Clues',
    category: 'problem',
    icon: '🔢',
    description: 'Toplamı ya da çarpımı hedef sayıyı veren iki sayıyı bul. Zihinden hesap ve problem çözme hızını geliştirir.',
    howTo: [
        'Üstte bir hedef sayı ve işlem (toplam ya da çarpım) görürsün.',
        'Altındaki 6 sayıdan, işlem sonucu hedefe eşit olan ikisini seç. Seçimi geri almak için sayıya tekrar dokun.',
        'Her soruda tek bir doğru çift vardır. Süre bitmeden bulursan kalan süre bonus puan olur.',
        'Takılırsan 💡 İpucu bir sayıyı gösterir (o soruda puanın yarıya iner, oyun başına 3 hak).',
        'Ulaştığın seviye kaydedilir; bir sonraki oyunda kaldığın yerden devam edebilirsin.',
    ],
    controls: '1–6 tuşları sayıları seçer, H ipucu',
    scoreRef: 250,
    supportsZen: true,

    create(ctx) {
        const { stage, clock, rng, zen } = ctx;
        let level = 1, startLevel = 1, score = 0, lives = 3, hints = HINTS, hintsUsed = 0, solved = 0, attempts = 0;
        let puzzle = null, selected = [], hintUsed = false, accepting = false, timeLeft = 0, puzzleTime = 0, stopTimer = null;

        const instruction = h('p', { class: 'fc-instruction' });
        const target = h('div', { class: 'fc-target', 'aria-live': 'polite' });
        const grid = h('div', { class: 'fc-grid' });
        const timerBar = h('div', { class: 'timer-bar' }, h('div', { class: 'timer-fill' }));
        const hintBtn = h('button', { class: 'btn btn-small', onclick: useHint }, '');
        const feedback = h('p', { class: 'fc-feedback', 'aria-live': 'polite' });
        const playArea = h('div', { class: 'fc-play' }, instruction, target, zen ? null : timerBar, grid, h('div', { class: 'btn-row' }, hintBtn), feedback);

        function updateHud() {
            ctx.hud({ Skor: score, Seviye: level, Can: zen ? null : hearts(lives), Süre: zen ? '∞' : `${Math.ceil(timeLeft)} sn` });
            hintBtn.textContent = `💡 İpucu (${hints})`;
            hintBtn.disabled = hints <= 0 || hintUsed || !accepting;
        }

        function begin(fromLevel) {
            stage.replaceChildren(playArea);
            level = startLevel = fromLevel;
            nextPuzzle();
        }

        function nextPuzzle() {
            puzzle = generateFusePuzzle(rng, level);
            selected = [];
            hintUsed = false;
            feedback.textContent = '';
            const [word, sign] = OP_TEXT[puzzle.op];
            instruction.replaceChildren(h('b', {}, word), ' hedefe eşit olan iki sayıyı seç');
            target.replaceChildren(h('span', { class: 'fc-label' }, `HEDEF (${sign})`), h('span', { class: 'fc-number' }, puzzle.target));
            grid.replaceChildren(...puzzle.options.map((n, i) => h('button', {
                class: 'fc-num', 'aria-pressed': 'false', onclick: () => toggle(i),
            }, n)));
            puzzleTime = timeLeft = Math.max(8, 16 - Math.floor(level / 2));
            accepting = true;
            stopTimer?.();
            if (!zen) {
                stopTimer = clock.every(100, () => {
                    const shownSecond = Math.ceil(timeLeft);
                    timeLeft = Math.max(0, timeLeft - 0.1);
                    timerBar.firstChild.style.width = `${(timeLeft / puzzleTime) * 100}%`;
                    if (Math.ceil(timeLeft) !== shownSecond) updateHud();
                    if (timeLeft <= 0) timeout();
                });
                timerBar.firstChild.style.width = '100%';
            }
            updateHud();
        }

        function buttons() { return [...grid.children]; }

        function toggle(i) {
            if (!accepting) return;
            const pos = selected.indexOf(i);
            if (pos >= 0) selected.splice(pos, 1); else selected.push(i);
            buttons().forEach((btn, k) => {
                btn.classList.toggle('selected', selected.includes(k));
                btn.setAttribute('aria-pressed', String(selected.includes(k)));
            });
            if (selected.length === 2) evaluate();
        }

        function evaluate() {
            accepting = false;
            stopTimer?.();
            attempts++;
            const [a, b] = selected.map(i => puzzle.options[i]);
            const ok = applyOp(puzzle.op, a, b) === puzzle.target;
            if (ok) {
                solved++;
                let gained = 10 + (zen ? 0 : Math.ceil(timeLeft));
                if (hintUsed) gained = Math.ceil(gained / 2);
                score += gained;
                level++;
                if (!zen) ctx.progress.set({ level });
                buttons().forEach((btn, k) => btn.classList.toggle('correct', selected.includes(k)));
                feedback.textContent = `Doğru! +${gained}`;
                ctx.flash('good');
                updateHud();
                clock.after(600, nextPuzzle);
            } else {
                fail(`${a} ${OP_TEXT[puzzle.op][1]} ${b} = ${applyOp(puzzle.op, a, b)}, hedef ${puzzle.target}.`);
            }
        }

        function timeout() {
            if (!accepting) return;
            accepting = false;
            stopTimer?.();
            attempts++;
            fail('Süre doldu.');
        }

        function fail(reason) {
            if (!zen) lives--;
            buttons().forEach((btn, k) => {
                btn.classList.toggle('wrong', selected.includes(k));
                btn.classList.toggle('reveal', puzzle.answer.includes(k));
            });
            const [i, j] = puzzle.answer;
            feedback.textContent = `${reason} Doğru çift: ${puzzle.options[i]} ve ${puzzle.options[j]}.`;
            ctx.flash('bad');
            updateHud();
            if (lives <= 0) clock.after(1600, () => ctx.finish(getResult()));
            else clock.after(1600, nextPuzzle);
        }

        function useHint() {
            if (!accepting || hints <= 0 || hintUsed) return;
            hints--;
            hintsUsed++;
            hintUsed = true;
            const k = puzzle.answer.find(i => !selected.includes(i)) ?? puzzle.answer[0];
            buttons()[k].classList.add('hint');
            ctx.announce(`İpucu: ${puzzle.options[k]} sayısı çiftin bir parçası`);
            updateHud();
        }

        function getResult() {
            return {
                score,
                accuracy: attempts ? solved / attempts : 0,
                level,
                details: [['Çözülen soru', solved], ['Başlangıç seviyesi', startLevel], ['Kullanılan ipucu', hintsUsed]],
            };
        }

        ctx.onKey(event => {
            const n = Number(event.key);
            if (n >= 1 && n <= 6 && puzzle && stage.contains(grid)) { toggle(n - 1); return true; }
            if ((event.key === 'h' || event.key === 'H') && stage.contains(grid)) { useHint(); return true; }
            return false;
        });

        return {
            start() {
                const saved = ctx.progress.get().level || 1;
                if (zen || saved <= 1) { begin(1); return; }
                ctx.hud({ Skor: 0 });
                stage.replaceChildren(h('div', { class: 'card choice-card' },
                    h('p', {}, `Geçen sefer `, h('b', {}, `${saved}. seviyeye`), ' ulaştın.'),
                    h('div', { class: 'btn-row' },
                        h('button', { class: 'btn btn-primary', onclick: () => begin(saved) }, `Seviye ${saved}'den devam et`),
                        h('button', { class: 'btn', onclick: () => begin(1) }, 'Baştan başla'))));
                stage.querySelector('button').focus();
            },
            getResult,
            debug: () => ({ puzzle, accepting }),
        };
    },
};
