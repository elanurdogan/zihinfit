// Zihinsel Döndürme: sağdaki şekil soldakinin döndürülmüş hali mi, yoksa ayna görüntüsü mü?

import { h, svg } from '../core/dom.js';
import { createTrialSession } from '../core/trialSession.js';
import { makeRotationTrial } from './logic/rotation.js';

function drawShape(cells, { angle = 0, mirrored = false } = {}) {
    const w = Math.max(...cells.map(([x]) => x)) + 1;
    const hgt = Math.max(...cells.map(([, y]) => y)) + 1;
    const size = Math.max(w, hgt);
    const offX = (size - w) / 2, offY = (size - hgt) / 2;
    return svg('svg', { class: 'mr-shape', viewBox: `-0.6 -0.6 ${size + 1.2} ${size + 1.2}`, 'aria-hidden': 'true' },
        svg('g', { transform: `rotate(${angle} ${size / 2} ${size / 2})${mirrored ? ` translate(${size} 0) scale(-1 1)` : ''}` },
            cells.map(([x, y]) => svg('rect', { x: x + offX + 0.04, y: y + offY + 0.04, width: 0.92, height: 0.92, rx: 0.15 }))));
}

export default {
    id: 'zihinsel-dondurme',
    title: 'Zihinsel Döndürme',
    original: 'Mental Rotation',
    category: 'problem',
    icon: '🧊',
    description: 'İki şekli karşılaştır: sağdaki, soldakinin döndürülmüş hali mi yoksa ayna görüntüsü mü? Uzamsal akıl yürütme.',
    howTo: [
        'Solda bir şekil, sağda aynı şeklin döndürülmüş ya da aynada yansıtılmış hali var.',
        'Şekli zihninde döndür: döndürünce birebir örtüşüyorsa AYNI, ancak ters çevirince örtüşüyorsa AYNA.',
        'İleri seviyelerde açılar 45°\'lik adımlarla artar ve soldaki şekil de döner.',
        '60 saniyen var.',
    ],
    controls: '← Aynı, → Ayna',
    scoreRef: 400,

    create(ctx) {
        const { stage, rng } = ctx;
        const left = h('div', { class: 'mr-box' });
        const right = h('div', { class: 'mr-box' });
        const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
        stage.append(h('div', { class: 'mr-pair' }, left, right), live, h('div', { class: 'answer-row' },
            h('button', { class: 'btn btn-answer', onclick: () => session.answer('ayni') }, '↻ AYNI'),
            h('button', { class: 'btn btn-answer', onclick: () => session.answer('ayna') }, '⇋ AYNA')));

        const session = createTrialSession(ctx, {
            seconds: 60,
            render(level) {
                const trial = makeRotationTrial(rng, level);
                left.replaceChildren(drawShape(trial.cells, { angle: trial.leftAngle }));
                right.replaceChildren(drawShape(trial.cells, { angle: trial.leftAngle + trial.angle, mirrored: trial.mirrored }));
                live.textContent = `Yeni şekil çifti, ${trial.angle} derece`;
                return { answer: trial.answer };
            },
        });

        ctx.onKey(event => {
            if (event.key === 'ArrowLeft') { session.answer('ayni'); return true; }
            if (event.key === 'ArrowRight') { session.answer('ayna'); return true; }
            return false;
        });

        return { start: () => session.start(), getResult: () => session.result() };
    },
};
