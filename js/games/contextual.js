// Kelime Bağlamı (Contextual esintili).
// Feedback'e karşılık: 12 kategorilik, ~230 kelimelik Türkçe sözlük; çeldiriciler başka kategorilerden de gelir;
// oyun sonunda kaçırılan kelimeler ve daha az bilinen kelimelerin anlamları gösterilir.

import { h, hearts } from '../core/dom.js';
import { WORD_CATEGORIES, FILLERS } from '../data/words.js';

const ROUNDS = 12;
const WORDS_PER_ROUND = 12;

export default {
    id: 'kelime-baglami',
    title: 'Kelime Bağlamı',
    original: 'Contextual',
    category: 'esneklik',
    icon: '🔎',
    description: 'Her turda hedef kategori değişir; yalnızca o kategoriye ait kelimeleri bul. Zihinsel esneklik ve kelime bilgisi.',
    howTo: [
        'Üstte bu turun kategorisi yazar (ör. MEYVE).',
        'Kelimeler arasından yalnızca o kategoriye ait olanlara dokun. Hepsini bulunca tur biter.',
        'Başka kategoriden kelimelere dikkat: yanlış dokunuş 1 can götürür. Süre biterse de 1 can gider.',
        '12 tur ya da 3 can. Oyun sonunda kaçırdığın kelimeleri ve az bilinen kelimelerin anlamlarını görürsün.',
    ],
    controls: 'Tab ile kelimeler arasında gezin, Enter ile seç',
    scoreRef: 450,

    create(ctx) {
        const { stage, clock, rng } = ctx;
        const categories = Object.keys(WORD_CATEGORIES);
        let round = 0, score = 0, lives = 3, found = 0, wrongTaps = 0, roundsCleared = 0;
        let targetCat = null, remaining = 0, accepting = false, stopTimer = null, timeLeft = 0;
        const missed = new Map(), rareSeen = new Map();
        let lastCat = null;

        const header = h('div', { class: 'ctx-header', 'aria-live': 'polite' });
        const timerBar = h('div', { class: 'timer-bar' }, h('div', { class: 'timer-fill' }));
        const wordArea = h('div', { class: 'ctx-words' });
        stage.append(header, timerBar, wordArea);

        function updateHud() {
            ctx.hud({ Skor: score, Tur: `${Math.min(round, ROUNDS)}/${ROUNDS}`, Can: hearts(lives) });
        }

        function nextRound() {
            if (round >= ROUNDS) { ctx.finish(getResult()); return; }
            round++;
            targetCat = rng.pick(categories.filter(cat => cat !== lastCat));
            lastCat = targetCat;
            const targetCount = Math.min(4, 2 + Math.floor(round / 4));
            const targets = rng.sample(WORD_CATEGORIES[targetCat], targetCount).map(entry => ({ ...entry, target: true }));
            const otherCats = categories.filter(cat => cat !== targetCat);
            const distractorCount = WORDS_PER_ROUND - targetCount;
            const fromCategories = Math.min(distractorCount, 3 + Math.floor(round / 2)); // ilerledikçe çeldirici kategoriler artar
            const distractors = [];
            while (distractors.length < fromCategories) {
                const entry = rng.pick(WORD_CATEGORIES[rng.pick(otherCats)]);
                if (!distractors.some(d => d.word === entry.word)) distractors.push({ ...entry, target: false });
            }
            for (const word of rng.sample(FILLERS, distractorCount - distractors.length)) distractors.push({ word, target: false });

            remaining = targetCount;
            header.replaceChildren('Sadece ', h('b', { class: 'ctx-cat' }, targetCat), ` kelimelerine dokun (${targetCount} tane)`);
            wordArea.replaceChildren(...rng.shuffle([...targets, ...distractors]).map(entry => {
                if (entry.meaning) rareSeen.set(entry.word, entry.meaning);
                const btn = h('button', { class: 'ctx-word', onclick: () => tap(btn, entry) }, entry.word);
                btn.entry = entry;
                return btn;
            }));
            timeLeft = Math.max(8, 18 - round);
            const total = timeLeft;
            stopTimer?.();
            stopTimer = clock.every(100, () => {
                timeLeft = Math.max(0, timeLeft - 0.1);
                timerBar.firstChild.style.width = `${(timeLeft / total) * 100}%`;
                if (timeLeft <= 0) timeUp();
            });
            timerBar.firstChild.style.width = '100%';
            accepting = true;
            updateHud();
        }

        function tap(btn, entry) {
            if (!accepting || btn.disabled) return;
            btn.disabled = true;
            if (entry.target) {
                btn.classList.add('correct');
                found++;
                score += 10;
                remaining--;
                ctx.sound('correct');
                if (remaining === 0) {
                    accepting = false;
                    stopTimer?.();
                    roundsCleared++;
                    const bonus = 10 + Math.ceil(timeLeft);
                    score += bonus;
                    ctx.flash('good');
                    ctx.announce(`Tur tamam! +${bonus} bonus`);
                    updateHud();
                    clock.after(700, nextRound);
                } else updateHud();
            } else {
                btn.classList.add('wrong');
                wrongTaps++;
                loseLife(`"${entry.word}" ${targetCat} değil`);
            }
        }

        function timeUp() {
            if (!accepting) return;
            accepting = false;
            stopTimer?.();
            wordArea.querySelectorAll('.ctx-word').forEach(btn => {
                if (btn.entry.target && !btn.classList.contains('correct')) btn.classList.add('missed');
                btn.disabled = true;
            });
            loseLife('Süre doldu', true);
        }

        function loseLife(reason, roundOver = false) {
            lives--;
            ctx.flash('bad');
            ctx.announce(reason);
            updateHud();
            if (lives <= 0 || roundOver) {
                accepting = false;
                stopTimer?.();
                wordArea.querySelectorAll('.ctx-word').forEach(btn => {
                    if (btn.entry.target && !btn.classList.contains('correct')) {
                        btn.classList.add('missed');
                        missed.set(btn.entry.word, targetCat);
                    }
                    btn.disabled = true;
                });
                clock.after(1400, () => (lives <= 0 ? ctx.finish(getResult()) : nextRound()));
            }
        }

        function getResult() {
            const notes = [
                ...[...missed].map(([word, cat]) => `Kaçırılan: "${word}" → ${cat}`),
                ...[...rareSeen].map(([word, meaning]) => `${word}: ${meaning}`),
            ];
            return {
                score,
                accuracy: found + wrongTaps ? found / (found + wrongTaps) : 0,
                level: roundsCleared,
                details: [['Bulunan kelime', found], ['Hatalı dokunuş', wrongTaps], ['Tamamlanan tur', `${roundsCleared} / ${ROUNDS}`]],
                notesTitle: 'Kelime notları',
                notes,
            };
        }

        return {
            start() { nextRound(); },
            getResult,
            debug: () => ({ targetCat, accepting }),
        };
    },
};
