// Hız Treni (Train of Thought esintili).
// Feedback'e karşılık: her renk aynı zamanda bir sembol taşır (renk körü modunda yüksek kontrastlı palet),
// ray yerine büyük dokunma alanları (istasyonların kendisi + alt butonlar), yumuşak zorluk eğrisi
// (hız seviye başına küçük adımlarla artar, 3. istasyon ancak 5. seviyede gelir), requestAnimationFrame + delta-time.

import { h, svg, hearts } from '../core/dom.js';

const PALETTE = [
    { id: 'kirmizi', name: 'KIRMIZI', color: '#E03131', cb: '#D55E00', symbol: '●' },
    { id: 'mavi', name: 'MAVİ', color: '#1C7ED6', cb: '#0072B2', symbol: '▲' },
    { id: 'yesil', name: 'YEŞİL', color: '#2F9E44', cb: '#009E73', symbol: '■' },
    { id: 'mor', name: 'MOR', color: '#9C36B5', cb: '#CC79A7', symbol: '★' },
    { id: 'turuncu', name: 'TURUNCU', color: '#F08C00', cb: '#E69F00', symbol: '◆' },
    { id: 'siyah', name: 'SİYAH', color: '#343A40', cb: '#000000', symbol: '✚' },
];
const JUNCTION = 38;      // makasın bulunduğu yükseklik (%)
const ARRIVAL = 82;       // istasyona varış yüksekliği (%)
const LAYOUTS = { 2: [20, 80], 3: [15, 50, 85] };
const DIRECTION_LABELS = { 2: ['◀ Sol', 'Sağ ▶'], 3: ['◀ Sol', '▲ Düz', 'Sağ ▶'] };
const MAX_LEVEL = 12;

export default {
    id: 'hiz-treni',
    title: 'Hız Treni',
    original: 'Train of Thought',
    category: 'dikkat',
    icon: '🚂',
    description: 'Trenleri kendi renklerindeki ve sembollerindeki istasyona yönlendir. Bölünmüş dikkatini ve planlamanı çalıştırır.',
    howTo: [
        'Yukarıdan bir tren gelir. Rengi ve sembolü bir istasyonla aynıdır.',
        'Tren makasa (ray ayrımına) varmadan yönü seç: alttaki butonlara ya da doğrudan istasyona dokun.',
        'Tren makası geçince yön kilitlenir. Yanlış istasyon 1 can götürür; 3 can bitince oyun biter.',
        'Her 5 doğru trende bir seviye atlarsın; 5. seviyede ortaya üçüncü (düz) istasyon eklenir.',
    ],
    controls: '← sol, → sağ, ↑ düz (3 istasyonda)',
    scoreRef: 400,

    create(ctx) {
        const { stage, clock, rng } = ctx;
        const palette = PALETTE.map(p => ({ ...p, hex: ctx.colorblind ? p.cb : p.color }));
        let level = 1, maxLevel = 1, score = 0, lives = 3, correct = 0, total = 0, streak = 0;
        let stations = [], targetIdx = 0, selected = null, lockedIdx = null, passed = false, y = 0, running = false;

        const rails = svg('svg', { class: 'tot-rails', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
        const stationLayer = h('div', { class: 'tot-stations' });
        const train = h('div', { class: 'tot-train', 'aria-hidden': 'true' });
        const status = h('p', { class: 'tot-status', 'aria-live': 'polite' });
        const controls = h('div', { class: 'tot-controls' });
        const board = h('div', { class: `tot-board${ctx.colorblind ? ' tot-cb' : ''}` }, rails, stationLayer, train);
        stage.append(board, status, controls);

        const speed = () => Math.min(40, 20 + (level - 1) * 1.8); // % / saniye

        function updateHud() {
            ctx.hud({ Skor: score, Seviye: level, Can: hearts(lives) });
        }

        function render() {
            const count = stations.length;
            rails.replaceChildren(
                svg('line', { x1: 50, y1: 0, x2: 50, y2: JUNCTION, class: 'rail' }),
                ...stations.map((st, i) => svg('line', { x1: 50, y1: JUNCTION, x2: st.x, y2: ARRIVAL + 6, class: 'rail branch', 'data-index': i })),
            );
            stationLayer.replaceChildren(...stations.map((st, i) => h('button', {
                class: 'tot-station',
                style: { left: `${st.x}%`, background: st.hex },
                'aria-label': `${st.name} istasyonu (${st.symbol})`,
                onclick: () => select(i),
            }, h('span', { class: 'tot-symbol' }, st.symbol), h('span', { class: 'tot-name' }, st.name))));
            controls.replaceChildren(...DIRECTION_LABELS[count].map((label, i) => h('button', {
                class: 'btn tot-dir', onclick: () => select(i),
            }, label)));
            train.style.background = stations[targetIdx].hex;
            train.textContent = stations[targetIdx].symbol;
            train.classList.remove('crash');
            updateSelection();
            moveTrain(50);
        }

        function updateSelection() {
            const active = passed ? lockedIdx : selected;
            rails.querySelectorAll('.branch').forEach(line => line.classList.toggle('active', Number(line.dataset.index) === active));
            stationLayer.querySelectorAll('.tot-station').forEach((btn, i) => btn.classList.toggle('selected', i === active));
            controls.querySelectorAll('.tot-dir').forEach((btn, i) => {
                btn.classList.toggle('selected', i === active);
                btn.disabled = passed;
            });
            status.textContent = passed ? 'Makas kilitlendi' : active == null ? 'Yön seç!' : `Makas: ${DIRECTION_LABELS[stations.length][active]}`;
        }

        function moveTrain(x) {
            train.style.left = `${x}%`;
            train.style.top = `${y}%`;
        }

        function newTrain() {
            const count = level >= 5 ? 3 : 2;
            stations = rng.sample(palette, count).map((p, i) => ({ ...p, x: LAYOUTS[count][i] }));
            targetIdx = rng.int(0, count - 1);
            selected = count === 3 ? 1 : null; // 3 istasyonda makas varsayılan olarak düz durur
            lockedIdx = null;
            passed = false;
            y = 0;
            render();
            running = true;
        }

        function select(i) {
            if (!running || passed) return;
            selected = i;
            updateSelection();
        }

        function frame(dt) {
            if (!running) return;
            y += (speed() * dt) / 1000;
            if (!passed && y >= JUNCTION) {
                passed = true;
                lockedIdx = selected;
                updateSelection();
            }
            let x = 50;
            if (passed) {
                const t = Math.min(1, (y - JUNCTION) / (ARRIVAL - JUNCTION));
                const targetX = lockedIdx == null ? 50 : stations[lockedIdx].x;
                x = 50 + (targetX - 50) * t;
            }
            moveTrain(x);
            if (y >= ARRIVAL) arrive();
        }

        function arrive() {
            running = false;
            total++;
            if (lockedIdx === targetIdx) {
                correct++;
                streak++;
                score += 10 + (level - 1) * 2;
                ctx.flash('good');
                if (streak % 5 === 0 && level < MAX_LEVEL) {
                    level++;
                    maxLevel = Math.max(maxLevel, level);
                    ctx.sound('level');
                    ctx.announce(level === 5 ? 'Seviye 5: artık üç istasyon var. Düz gitmek için ↑' : `Seviye ${level}`);
                }
            } else {
                lives--;
                streak = 0;
                train.classList.add('crash');
                ctx.flash('bad');
                ctx.announce(lockedIdx == null ? 'Makas ayarlanmadı' : 'Yanlış istasyon');
            }
            updateHud();
            if (lives <= 0) clock.after(800, () => ctx.finish(getResult()));
            else clock.after(500, newTrain);
        }

        function getResult() {
            return {
                score,
                accuracy: total ? correct / total : 0,
                level: maxLevel,
                details: [['Doğru tren', `${correct} / ${total}`]],
            };
        }

        ctx.onKey(event => {
            const count = stations.length;
            if (event.key === 'ArrowLeft' || event.key === 'a') { select(0); return true; }
            if (event.key === 'ArrowRight' || event.key === 'd') { select(count - 1); return true; }
            if ((event.key === 'ArrowUp' || event.key === 'w') && count === 3) { select(1); return true; }
            return false;
        });

        return {
            start() {
                updateHud();
                clock.onFrame(frame);
                newTrain();
            },
            getResult,
            debug: () => ({ targetIdx, passed, y, stations: stations.length }),
        };
    },
};
