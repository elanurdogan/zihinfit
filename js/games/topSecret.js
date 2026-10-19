// Gizli Rota (Top Secret esintili): yanıp sönen yön dizisini hatırla.
// Feedback'e karşılık: ilk oynayışta adım adım etkileşimli öğretici (ayarlardan sıfırlanabilir);
// rota tekrar jokeri; hata sonrası aynı rota yeniden gösterilir, ilerleme silinmez.

import { h, hearts } from '../core/dom.js';

const DIRS = [
    { id: 'UP', glyph: '▲', label: 'Yukarı', keys: ['ArrowUp', 'w'] },
    { id: 'LEFT', glyph: '◀', label: 'Sol', keys: ['ArrowLeft', 'a'] },
    { id: 'RIGHT', glyph: '▶', label: 'Sağ', keys: ['ArrowRight', 'd'] },
    { id: 'DOWN', glyph: '▼', label: 'Aşağı', keys: ['ArrowDown', 's'] },
];
const TUTORIAL_ROUTE = ['UP', 'RIGHT'];

export default {
    id: 'gizli-rota',
    title: 'Gizli Rota',
    original: 'Top Secret',
    category: 'hafiza',
    icon: '🗺️',
    description: 'Yanıp sönen yön tuşlarını izle ve aynı sırayla tekrarla. Sıralı ve uzamsal hafızayı güçlendirir.',
    howTo: [
        'Yön tuşları sırayla yanar: bu gizli rotadır.',
        'Rota bitince sıra sende: aynı tuşlara aynı sırayla bas.',
        'Her seviyede rota bir adım uzar. Yanlış tuş 1 can götürür ve rota yeniden gösterilir.',
        'Her seviyede bir kez 🔄 Rotayı Tekrar Göster jokerini kullanabilirsin.',
        'İlk oynayışında kısa bir öğretici seni adım adım yönlendirir.',
    ],
    controls: 'Ok tuşları ya da W A S D, R joker',
    scoreRef: 350,

    create(ctx) {
        const { stage, clock, rng } = ctx;
        let level = 1, maxLevel = 1, score = 0, lives = 3, inputsOk = 0, inputsBad = 0, longest = 0;
        let sequence = [], index = 0, mode = 'idle', jokerUsed = false, tutorial = false;

        const instruction = h('p', { class: 'ts-instruction', 'aria-live': 'polite' });
        const dots = h('div', { class: 'ts-dots', 'aria-hidden': 'true' });
        const pad = h('div', { class: 'ts-pad' }, DIRS.map(dir => h('button', {
            class: `ts-btn ts-${dir.id.toLowerCase()}`, 'aria-label': dir.label, dataset: { dir: dir.id }, onclick: () => input(dir.id),
        }, dir.glyph)));
        const jokerBtn = h('button', { class: 'btn btn-small', onclick: useJoker }, '🔄 Rotayı Tekrar Göster');
        const extra = h('div', { class: 'btn-row' }, jokerBtn);
        stage.append(instruction, dots, pad, extra);

        const button = id => pad.querySelector(`[data-dir="${id}"]`);
        const updateHud = () => { if (!tutorial) ctx.hud({ Skor: score, Seviye: level, Can: hearts(lives) }); };

        function renderDots() {
            dots.replaceChildren(...sequence.map((_, i) => h('span', { class: `ts-dot${i < index ? ' filled' : ''}` })));
        }
        function updateJoker() {
            jokerBtn.hidden = tutorial;
            jokerBtn.disabled = jokerUsed || mode !== 'input';
            jokerBtn.textContent = jokerUsed ? '🔄 Joker kullanıldı' : '🔄 Rotayı Tekrar Göster';
        }

        function show(then) {
            mode = 'showing';
            index = 0;
            renderDots();
            updateJoker();
            pad.classList.add('watching');
            const on = tutorial ? 800 : Math.max(350, 600 - level * 25);
            const off = tutorial ? 400 : 250;
            let i = 0;
            const step = () => {
                if (i >= sequence.length) {
                    pad.classList.remove('watching');
                    mode = 'input';
                    updateJoker();
                    then();
                    return;
                }
                const btn = button(sequence[i]);
                btn.classList.add('flash');
                clock.after(on, () => {
                    btn.classList.remove('flash');
                    i++;
                    clock.after(off, step);
                });
            };
            clock.after(500, step);
        }

        function newLevel() {
            sequence = Array.from({ length: 2 + level }, () => rng.pick(DIRS).id);
            jokerUsed = false;
            instruction.textContent = 'Rotayı dikkatle izle…';
            updateHud();
            show(() => { instruction.textContent = 'Sıra sende! Rotayı tekrarla.'; });
        }

        function input(id) {
            if (mode !== 'input') return;
            const btn = button(id);
            btn.classList.remove('press');
            void btn.offsetWidth;
            btn.classList.add('press');
            if (tutorial) return tutorialInput(id);
            if (id === sequence[index]) {
                inputsOk++;
                index++;
                renderDots();
                ctx.sound('tick');
                if (index === sequence.length) {
                    mode = 'idle';
                    longest = Math.max(longest, sequence.length);
                    score += sequence.length * 10;
                    level++;
                    maxLevel = Math.max(maxLevel, level);
                    ctx.flash('good');
                    instruction.textContent = 'Harika! Rota uzuyor…';
                    updateJoker();
                    updateHud();
                    clock.after(900, newLevel);
                }
            } else {
                inputsBad++;
                lives--;
                mode = 'idle';
                ctx.flash('bad');
                updateHud();
                updateJoker();
                if (lives <= 0) {
                    instruction.textContent = 'Canın kalmadı.';
                    clock.after(900, () => ctx.finish(getResult()));
                } else {
                    instruction.textContent = 'Yanlış yön! Rota yeniden gösteriliyor…';
                    clock.after(700, () => show(() => { instruction.textContent = 'Tekrar dene: rotayı baştan gir.'; }));
                }
            }
        }

        function useJoker() {
            if (mode !== 'input' || jokerUsed || tutorial) return;
            jokerUsed = true;
            instruction.textContent = 'Rota tekrar gösteriliyor…';
            show(() => { instruction.textContent = 'Sıra sende! Rotayı baştan gir.'; });
        }

        // ---------- Öğretici ----------
        function startTutorial() {
            tutorial = true;
            sequence = TUTORIAL_ROUTE;
            ctx.hud({ Öğretici: '1/3' });
            instruction.replaceChildren(h('b', {}, 'Adım 1: '), 'Yanan tuşları izle. Bu senin gizli rotan.');
            show(() => {
                ctx.hud({ Öğretici: '2/3' });
                hintNext();
            });
        }

        function hintNext() {
            pad.querySelectorAll('.ts-btn').forEach(b => b.classList.remove('hint'));
            const dir = DIRS.find(d => d.id === sequence[index]);
            button(dir.id).classList.add('hint');
            instruction.replaceChildren(h('b', {}, 'Adım 2: '), `Şimdi sen tekrarla. ${index + 1}. tuş: ${dir.glyph} ${dir.label} (çerçeveli tuş).`);
        }

        function tutorialInput(id) {
            if (id !== sequence[index]) {
                instruction.replaceChildren(h('b', {}, 'Neredeyse! '), 'Çerçeveli tuşa bas. Gerçek oyunda yanlış tuş 1 can götürür.');
                return;
            }
            index++;
            renderDots();
            ctx.sound('correct');
            if (index < sequence.length) { hintNext(); return; }
            pad.querySelectorAll('.ts-btn').forEach(b => b.classList.remove('hint'));
            mode = 'idle';
            ctx.hud({ Öğretici: '3/3' });
            instruction.replaceChildren(h('b', {}, 'Adım 3: '), 'Süper! Rotayı unutursan her seviyede bir kez 🔄 jokerle tekrar izleyebilirsin.');
            extra.replaceChildren(h('button', { class: 'btn btn-primary', onclick: finishTutorial }, 'Anladım, oyuna başla'));
            extra.querySelector('button').focus();
        }

        function finishTutorial() {
            ctx.progress.set({ tutorialDone: true });
            tutorial = false;
            ctx.hud({ Öğretici: null });
            extra.replaceChildren(jokerBtn);
            newLevel();
        }

        function getResult() {
            return {
                score,
                accuracy: inputsOk + inputsBad ? inputsOk / (inputsOk + inputsBad) : 0,
                level: maxLevel,
                details: [['En uzun rota', `${longest} adım`]],
            };
        }

        ctx.onKey(event => {
            if (event.key === 'r' || event.key === 'R') { useJoker(); return true; }
            const dir = DIRS.find(d => d.keys.includes(event.key));
            if (dir) { input(dir.id); return true; }
            return false;
        });

        return {
            start() {
                if (ctx.progress.get().tutorialDone) newLevel(); else startTutorial();
            },
            getResult,
            debug: () => ({ sequence, index, mode, tutorial }),
        };
    },
};
