// Kural Değiştir (görev değiştirme): kart üstte çıkarsa sayıya, altta çıkarsa harfe bak.

import { h } from '../core/dom.js';
import { createTrialSession } from '../core/trialSession.js';
import { makeRuleTrial } from './logic/generators.js';

export default {
    id: 'kural-degistir',
    title: 'Kural Değiştir',
    original: 'Task Switching',
    category: 'esneklik',
    icon: '🔀',
    description: 'Kartın çıktığı yere göre kural değişir: üstte sayı çift mi, altta harf sesli mi? Bilişsel esneklik.',
    howTo: [
        'Kartta bir sayı ve bir harf vardır (ör. 7A).',
        'Kart ÜST bölmede çıkarsa: sayı ÇİFT mi? diye sor.',
        'Kart ALT bölmede çıkarsa: harf SESLİ mi? (A E I O U Ö Ü) diye sor.',
        'Cevabın EVET ya da HAYIR. Kural değiştiğinde acele etme; 60 saniyen var.',
    ],
    controls: '← Hayır, → Evet',
    scoreRef: 450,

    create(ctx) {
        const { stage, rng } = ctx;
        let lastRule = null;
        const switchStats = { switch: [0, 0], repeat: [0, 0] };

        const card = () => h('div', { class: 'rs-card' });
        const topSlot = h('div', { class: 'rs-slot' }, card());
        const bottomSlot = h('div', { class: 'rs-slot' }, card());
        const panels = h('div', { class: 'rs-panels' },
            h('div', { class: 'rs-panel rs-top' }, h('p', { class: 'rs-label' }, 'Sayı ÇİFT mi?'), topSlot),
            h('div', { class: 'rs-panel rs-bottom' }, h('p', { class: 'rs-label' }, 'Harf SESLİ mi?'), bottomSlot));
        const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
        stage.append(panels, live, h('div', { class: 'answer-row' },
            h('button', { class: 'btn btn-answer', onclick: () => session.answer('hayir') }, '✗ HAYIR'),
            h('button', { class: 'btn btn-answer', onclick: () => session.answer('evet') }, '✓ EVET')));

        const session = createTrialSession(ctx, {
            seconds: 60,
            render(level) {
                const trial = makeRuleTrial(rng, level, lastRule);
                lastRule = trial.rule;
                const [active, idle] = trial.rule === 'sayi' ? [topSlot, bottomSlot] : [bottomSlot, topSlot];
                active.firstChild.textContent = `${trial.number}${trial.letter}`;
                active.firstChild.classList.add('show');
                idle.firstChild.textContent = '';
                idle.firstChild.classList.remove('show');
                panels.dataset.active = trial.rule;
                live.textContent = `${trial.rule === 'sayi' ? 'Üstte: sayı çift mi?' : 'Altta: harf sesli mi?'} ${trial.number}${trial.letter}`;
                const bucket = trial.switched ? switchStats.switch : switchStats.repeat;
                return { answer: trial.answer, onResult: ok => { bucket[1]++; if (ok) bucket[0]++; } };
            },
            details() {
                const pct = ([ok, n]) => (n ? `%${Math.round((ok / n) * 100)}` : '—');
                return [['Kural değişince doğruluk', pct(switchStats.switch)], ['Aynı kuralda doğruluk', pct(switchStats.repeat)]];
            },
        });

        ctx.onKey(event => {
            if (event.key === 'ArrowLeft') { session.answer('hayir'); return true; }
            if (event.key === 'ArrowRight') { session.answer('evet'); return true; }
            return false;
        });

        return { start: () => session.start(), getResult: () => session.result() };
    },
};
