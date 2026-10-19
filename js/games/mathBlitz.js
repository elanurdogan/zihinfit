// Sayı Fırtınası: işlem doğru mu yanlış mı? Hızlı sayısal karar.

import { h } from '../core/dom.js';
import { createTrialSession } from '../core/trialSession.js';
import { generateEquation } from './logic/generators.js';

export default {
    id: 'sayi-firtinasi',
    title: 'Sayı Fırtınası',
    original: 'Raindrops',
    category: 'hiz',
    icon: '➗',
    description: 'Ekrandaki işlemin sonucu doğru mu? Olabildiğince hızlı karar ver. Sayısal işlem hızı.',
    howTo: [
        'Bir işlem ve sonucu görürsün (ör. 7 + 5 = 12).',
        'Sonuç doğruysa DOĞRU, yanlışsa YANLIŞ butonuna bas.',
        'Yanlış sonuçlar doğruya çok yakın olabilir; dikkatli ol.',
        'Seviye arttıkça çıkarma, çarpma ve bölme eklenir. 60 saniyen var.',
    ],
    controls: '← Yanlış, → Doğru',
    scoreRef: 450,

    create(ctx) {
        const { stage, rng } = ctx;
        const equation = h('div', { class: 'mb-equation', 'aria-live': 'polite' });
        const noBtn = h('button', { class: 'btn btn-answer', onclick: () => session.answer('yanlis') }, '✗ YANLIŞ');
        const yesBtn = h('button', { class: 'btn btn-answer', onclick: () => session.answer('dogru') }, '✓ DOĞRU');
        stage.append(equation, h('div', { class: 'answer-row' }, noBtn, yesBtn));

        const session = createTrialSession(ctx, {
            seconds: 60,
            render(level) {
                const eq = generateEquation(rng, level);
                equation.className = 'mb-equation';
                equation.textContent = eq.text;
                return { answer: eq.answer, onResult: ok => equation.classList.add(ok ? 'ok' : 'bad') };
            },
        });

        ctx.onKey(event => {
            if (event.key === 'ArrowLeft') { session.answer('yanlis'); return true; }
            if (event.key === 'ArrowRight') { session.answer('dogru'); return true; }
            return false;
        });

        return { start: () => session.start(), getResult: () => session.result() };
    },
};
