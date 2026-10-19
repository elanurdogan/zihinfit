// Renk Çatışması (Stroop): yazının rengini ya da kelimenin anlamını seç; kural soru soru değişebilir.
// Renk körlüğü: renk körü modunda Okabe–Ito paleti kullanılır; cevap butonlarında renk adı yazılıdır.

import { h } from '../core/dom.js';
import { createTrialSession } from '../core/trialSession.js';
import { STROOP_COLORS, makeStroopTrial } from './logic/generators.js';

const RULES = {
    renk: { icon: '🎨', text: 'YAZININ RENGİ ne?' },
    anlam: { icon: '📖', text: 'KELİMENİN ANLAMI ne?' },
};

export default {
    id: 'renk-catismasi',
    title: 'Renk Çatışması',
    original: 'Stroop',
    category: 'esneklik',
    icon: '🎨',
    description: 'Kelime bir renk söyler, yazı başka bir renktedir. Kurala göre doğru olanı seç. Dürtü kontrolü ve esneklik.',
    howTo: [
        'Ortada bir renk adı görürsün; yazının rengi çoğu zaman kelimeden farklıdır.',
        '🎨 "YAZININ RENGİ" sorulursa mürekkebin rengini seç (kelimeyi değil!).',
        '2. seviyeden sonra bazen 📖 "KELİMENİN ANLAMI" sorulur; o zaman yazılı kelimeyi seç.',
        'Üstteki kurala her soruda bak. 60 saniyen var.',
    ],
    controls: '1–4 tuşları butonları sırayla seçer',
    scoreRef: 450,

    create(ctx) {
        const { stage, rng } = ctx;
        const palette = ctx.colorblind ? STROOP_COLORS.colorblind : STROOP_COLORS.normal;
        const ruleEl = h('p', { class: 'cc-rule', 'aria-live': 'polite' });
        const word = h('div', { class: 'cc-word' });
        const answers = h('div', { class: 'cc-answers' }, palette.map((color, i) => h('button', {
            class: 'btn cc-answer', onclick: () => session.answer(color.id),
        }, h('span', { class: 'cc-swatch', style: { background: color.hex }, 'aria-hidden': 'true' }), `${i + 1}. ${color.name}`)));
        stage.append(ruleEl, h('div', { class: 'cc-card' }, word), answers);

        const session = createTrialSession(ctx, {
            seconds: 60,
            render(level) {
                const trial = makeStroopTrial(rng, level, palette);
                const rule = RULES[trial.rule];
                ruleEl.className = `cc-rule rule-${trial.rule}`;
                ruleEl.textContent = `${rule.icon} ${rule.text}`;
                word.textContent = trial.word.name;
                word.style.color = trial.ink.hex;
                word.setAttribute('aria-label', `${trial.word.name} kelimesi, ${trial.ink.name.toLowerCase()} renkte yazılmış`);
                return { answer: trial.answer };
            },
        });

        ctx.onKey(event => {
            const n = Number(event.key);
            if (n >= 1 && n <= palette.length) { session.answer(palette[n - 1].id); return true; }
            return false;
        });

        return { start: () => session.start(), getResult: () => session.result() };
    },
};
