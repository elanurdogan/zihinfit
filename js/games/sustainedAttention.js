// Sürekli Dikkat (1-geri): bu sembol bir öncekiyle aynı mı?
// Eski 9. oyunun düzeltilmiş hali: tek zamanlayıcı (ctx.clock), kaçırılan cevaplar da hata sayılır,
// eşleşme sembolle yapılır (renk ek ipucudur; renk körü modunda tek renk).

import { h } from '../core/dom.js';
import { createTrialSession } from '../core/trialSession.js';
import { nextSymbol } from './logic/generators.js';

export default {
    id: 'surekli-dikkat',
    title: 'Sürekli Dikkat',
    original: 'Speed Match',
    category: 'dikkat',
    icon: '👁️',
    description: 'Her yeni sembolün bir öncekiyle aynı olup olmadığına hızlıca karar ver. Sürekli dikkat ve çalışma belleği.',
    howTo: [
        'İlk sembolü aklında tut.',
        'Her yeni sembolde karar ver: bir öncekiyle AYNI mı, FARKLI mı?',
        'Cevap vermezsen 2,5 saniye sonra kaçırılmış sayılır.',
        'Art arda doğru cevaplar çarpanını yükseltir (en fazla ×4). 60 saniyen var.',
    ],
    controls: '← Farklı, → Aynı',
    scoreRef: 700,

    create(ctx) {
        const { stage, clock, rng } = ctx;
        let previous = null, current = null;

        const card = h('div', { class: 'sa-card', 'aria-live': 'polite' });
        const question = h('p', { class: 'sa-question' }, 'İlk sembolü aklında tut');
        const noBtn = h('button', { class: 'btn btn-answer', disabled: true, onclick: () => session.answer('hayir') }, '✗ FARKLI');
        const yesBtn = h('button', { class: 'btn btn-answer', disabled: true, onclick: () => session.answer('evet') }, '✓ AYNI');
        stage.append(question, card, h('div', { class: 'answer-row' }, noBtn, yesBtn));

        function drawCard(symbol) {
            card.classList.remove('enter');
            void card.offsetWidth;
            card.classList.add('enter');
            card.replaceChildren(h('span', { class: 'sa-glyph', style: { color: ctx.colorblind ? '#212529' : symbol.color } }, symbol.glyph));
            card.setAttribute('aria-label', `Sembol: ${symbol.id}`);
        }

        const session = createTrialSession(ctx, {
            seconds: 60,
            responseMs: 2500,
            render() {
                previous = current;
                current = nextSymbol(rng, previous);
                drawCard(current);
                question.textContent = 'Bir öncekiyle aynı mı?';
                return {
                    answer: current === previous ? 'evet' : 'hayir',
                    onResult: (ok, timedOut) => { if (timedOut) question.textContent = 'Süre doldu!'; else if (!ok) question.textContent = current === previous ? 'Aynıydı!' : 'Farklıydı!'; },
                };
            },
        });

        ctx.onKey(event => {
            if (event.key === 'ArrowLeft') { session.answer('hayir'); return true; }
            if (event.key === 'ArrowRight') { session.answer('evet'); return true; }
            return false;
        });

        return {
            start() {
                ctx.hud({ Skor: 0 });
                current = nextSymbol(rng, null);
                drawCard(current);
                clock.after(1600, () => {
                    noBtn.disabled = yesBtn.disabled = false;
                    session.start();
                });
            },
            getResult: () => session.result(),
            debug: () => ({ same: current === previous }),
        };
    },
};
