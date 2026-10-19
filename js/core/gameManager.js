// Tek aktif oyunu yöneten durum makinesi: intro → playing ⇄ paused → result.
// Oyunlar DOM'a, klavyeye ve zamanlayıcılara yalnızca kendilerine verilen ctx üzerinden erişir;
// oyun değişince/bitince teardown() her şeyi temizler.

import { h, clear, formatTime } from './dom.js';
import { createClock } from './clock.js';
import { createRng } from './rng.js';
import { normalizeResult } from '../services/analysis.js';
import { confirmDialog, isDialogOpen } from '../ui/dialogs.js';
import { getGame, getCategory } from '../games/registry.js';

export class GameManager {
    constructor({ root, storage, settings, scores, sound, workout, seed, navigate }) {
        Object.assign(this, { root, storage, settings, scores, sound, workout, seed, navigate });
        this.state = 'idle';
        this.runCount = 0;
        this.keyHandlers = new Set();
        document.addEventListener('keydown', event => this.handleKey(event));
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === 'playing') this.pause();
        });
    }

    // ---------- Yaşam döngüsü ----------

    open(gameId, { workoutIndex = null } = {}) {
        this.teardown();
        this.def = getGame(gameId);
        this.workoutIndex = workoutIndex;
        this.zen = false;
        this.renderShell();
        this.showIntro();
    }

    close() {
        this.teardown();
        this.state = 'idle';
        this.def = null;
        clear(this.root);
    }

    teardown() {
        this.instance?.destroy?.();
        this.clock?.destroy();
        this.instance = null;
        this.clock = null;
        this.keyHandlers = new Set();
    }

    start() {
        this.teardown();
        this.sound.unlock();
        this.runCount++;
        this.state = 'playing';
        const { stage } = this.els;
        clear(stage);
        stage.className = `stage stage-${this.def.id}`;
        this.hudValues = {};
        clear(this.els.hud);
        this.els.panel.hidden = true;
        this.els.hud.hidden = false;
        this.els.stageWrap.hidden = false;
        this.els.pauseOverlay.hidden = true;
        this.updateControls();

        const seed = this.seed ? `${this.seed}:${this.def.id}:${this.runCount}` : (Date.now() ^ Math.floor(Math.random() * 1e9));
        this.clock = createClock();
        this.instance = this.def.create(this.createContext(createRng(seed)));
        this.instance.start();
        this.els.stageWrap.scrollIntoView?.({ block: 'nearest' });
    }

    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        this.clock.pause();
        this.els.stage.classList.add('is-paused');
        this.els.pauseOverlay.hidden = false;
        this.updateControls();
        this.els.pauseOverlay.querySelector('button').focus();
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = 'playing';
        this.clock.resume();
        this.els.stage.classList.remove('is-paused');
        this.els.pauseOverlay.hidden = true;
        this.updateControls();
    }

    async requestRestart() {
        if (this.state === 'playing') this.pause();
        const ok = await confirmDialog({
            title: 'Yeniden başlatılsın mı?',
            message: 'Bu oyundaki ilerlemen kaybolacak ve oyun baştan başlayacak.',
            confirmText: 'Yeniden başlat',
            danger: true,
        });
        if (ok && this.state === 'paused') this.start();
    }

    async requestQuit() {
        if (this.state === 'playing' || this.state === 'paused') {
            if (this.state === 'playing') this.pause();
            const ok = await confirmDialog({
                title: 'Oyundan çıkılsın mı?',
                message: 'Bu oyun yarıda kalacak ve skorun kaydedilmeyecek.',
                confirmText: 'Çık',
                danger: true,
            });
            if (!ok) return;
        }
        this.navigate('#/');
    }

    endEarly() {
        if (this.instance) this.finish(this.instance.getResult());
    }

    finish(result) {
        if (this.state !== 'playing' && this.state !== 'paused') return;
        const durationMs = Math.round(this.clock.now);
        this.teardown();
        this.state = 'result';
        this.updateControls();

        const entry = {
            date: new Date().toISOString(),
            score: Math.max(0, Math.round(result.score || 0)),
            accuracy: result.accuracy ?? null,
            level: result.level ?? null,
            durationMs,
        };
        entry.normalized = normalizeResult(this.def, { ...result, ...entry });
        let record = null;
        if (!this.zen) {
            record = this.scores.record(this.def.id, entry);
            if (this.workoutIndex != null) this.workout.markDone(this.workoutIndex, this.def.id, entry.normalized);
        }
        this.sound.play('end');
        this.renderResult(entry, result, record);
    }

    // ---------- Oyuna verilen bağlam ----------

    createContext(rng) {
        const token = this.runCount;
        const live = () => token === this.runCount && this.instance !== null;
        const def = this.def;
        return {
            stage: this.els.stage,
            clock: this.clock,
            rng,
            zen: this.zen,
            colorblind: !!this.settings.get('colorblind'),
            reducedMotion: this.settings.reducedMotion(),
            hud: values => { if (token === this.runCount) this.setHud(values); },
            announce: text => { if (token === this.runCount) this.announce(text); },
            flash: kind => { if (live()) this.flash(kind); },
            sound: name => { if (live()) this.sound.play(name); },
            onKey: fn => { if (token === this.runCount) this.keyHandlers.add(fn); },
            countdown: (seconds, onEnd) => this.countdown(seconds, onEnd),
            progress: {
                get: () => this.storage.get('progress', {})[def.id] || {},
                set: patch => {
                    const all = this.storage.get('progress', {});
                    all[def.id] = { ...(all[def.id] || {}), ...patch };
                    this.storage.set('progress', all);
                },
            },
            finish: result => { if (live()) this.finish(result); },
        };
    }

    countdown(seconds, onEnd) {
        const clock = this.clock;
        if (this.zen) {
            this.setHud({ Süre: '∞' });
            return { remaining: () => Infinity, add() {} };
        }
        let endAt = clock.now + seconds * 1000;
        const render = () => this.setHud({ Süre: formatTime(endAt - clock.now) });
        render();
        const stop = clock.every(200, () => {
            render();
            if (clock.now >= endAt) { stop(); onEnd(); }
        });
        return {
            remaining: () => Math.max(0, endAt - clock.now),
            add(sec) { endAt = Math.max(clock.now, endAt + sec * 1000); render(); },
        };
    }

    setHud(values) {
        Object.assign(this.hudValues, values);
        clear(this.els.hud);
        for (const [label, value] of Object.entries(this.hudValues)) {
            if (value == null) continue;
            this.els.hud.append(h('span', { class: 'pill' }, h('span', { class: 'pill-label' }, label), h('b', {}, value)));
        }
    }

    announce(text) {
        this.els.live.textContent = '';
        requestAnimationFrame(() => { if (this.els) this.els.live.textContent = text; });
    }

    flash(kind) {
        this.sound.play(kind === 'good' ? 'correct' : 'wrong');
        const stage = this.els.stage;
        stage.classList.remove('flash-good', 'flash-bad');
        void stage.offsetWidth; // animasyonu yeniden tetikle
        stage.classList.add(`flash-${kind}`);
    }

    handleKey(event) {
        if (isDialogOpen() || !this.def) return;
        const isPauseKey = event.key === 'Escape' || event.key === 'p' || event.key === 'P';
        if (this.state === 'paused' && isPauseKey) { this.resume(); event.preventDefault(); return; }
        if (this.state !== 'playing') return;
        if (isPauseKey) { this.pause(); event.preventDefault(); return; }
        // Odak bir butondaysa Enter/Boşluk butonun kendi tıklamasıdır; oyuna ikinci kez iletme
        if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLButtonElement) return;
        for (const fn of this.keyHandlers) {
            if (fn(event) === true) { event.preventDefault(); break; }
        }
    }

    // ---------- Görünüm ----------

    renderShell() {
        clear(this.root);
        const def = this.def;
        const category = getCategory(def.category);
        const els = (this.els = {});
        els.pauseBtn = h('button', { class: 'btn btn-small', onclick: () => this.pause(), 'aria-label': 'Duraklat (P)' }, '⏸ Duraklat');
        els.finishBtn = h('button', { class: 'btn btn-small', onclick: () => this.endEarly() }, '⏹ Bitir');
        els.hud = h('div', { class: 'hud', 'aria-label': 'Oyun durumu', hidden: true });
        els.stage = h('div', { class: 'stage' });
        els.pauseOverlay = h('div', { class: 'pause-overlay', hidden: true, role: 'dialog', 'aria-label': 'Oyun duraklatıldı' },
            h('h3', {}, 'Duraklatıldı'),
            h('button', { class: 'btn btn-primary', onclick: () => this.resume() }, '▶ Devam et'),
            h('button', { class: 'btn', onclick: () => this.requestRestart() }, '↻ Yeniden başlat'),
            h('button', { class: 'btn', onclick: () => this.endEarly() }, '⏹ Bitir ve sonucu gör'),
            h('button', { class: 'btn btn-ghost', onclick: () => this.requestQuit() }, '✕ Oyundan çık'),
        );
        els.stageWrap = h('div', { class: 'stage-wrap', hidden: true }, els.stage, els.pauseOverlay);
        els.panel = h('div', { class: 'panel' });
        els.live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
        this.root.append(h('div', { class: 'game-shell' },
            h('div', { class: 'game-top' },
                h('button', { class: 'btn btn-ghost btn-small', onclick: () => this.requestQuit() }, '← Oyunlar'),
                h('div', { class: 'game-title' },
                    h('span', { class: 'game-title-icon', 'aria-hidden': 'true' }, def.icon),
                    h('h2', {}, def.title),
                    h('span', { class: `badge badge-${category.key}` }, category.label)),
                h('div', { class: 'game-actions' }, els.finishBtn, els.pauseBtn)),
            els.hud, els.stageWrap, els.panel, els.live));
        this.updateControls();
    }

    updateControls() {
        if (!this.els) return;
        const active = this.state === 'playing' || this.state === 'paused';
        this.els.pauseBtn.hidden = this.state !== 'playing';
        this.els.finishBtn.hidden = !(active && this.zen);
    }

    workoutTag() {
        if (this.workoutIndex == null) return null;
        const slots = this.workout.today().slots;
        return h('p', { class: 'workout-tag' }, `🏋️ Günlük antrenman · ${this.workoutIndex + 1}/${slots.length}`);
    }

    showIntro() {
        this.state = 'intro';
        this.updateControls();
        const def = this.def;
        const { panel } = this.els;
        clear(panel);
        panel.hidden = false;
        this.els.hud.hidden = true;
        this.els.stageWrap.hidden = true;
        const stats = this.scores.stats(def.id);
        const zenBox = h('input', { type: 'checkbox', onchange: e => { this.zen = e.target.checked; } });
        const startBtn = h('button', { class: 'btn btn-primary btn-large', onclick: () => this.start() }, 'Başla');
        panel.append(h('div', { class: 'card intro-card' },
            this.workoutTag(),
            h('p', { class: 'intro-desc' }, def.description),
            h('h3', {}, 'Nasıl oynanır?'),
            h('ol', { class: 'howto' }, def.howTo.map(step => h('li', {}, step))),
            def.controls && h('p', { class: 'controls-hint' }, h('span', { 'aria-hidden': 'true' }, '⌨️ '), def.controls),
            h('p', { class: 'best' }, stats.best ? `En iyi skorun: ${stats.best.score} · ${stats.plays} kez oynadın` : 'Bu oyunu ilk kez oynuyorsun.'),
            def.supportsZen && h('label', { class: 'zen-toggle' }, zenBox,
                h('span', {}, h('b', {}, 'Zen modu'), ' — süre yok, acele yok. Skor kaydedilmez; istediğinde "Bitir"e bas.')),
            h('div', { class: 'btn-row' }, startBtn,
                h('button', { class: 'btn', onclick: () => this.navigate('#/') }, 'Oyunlara dön'))));
        startBtn.focus({ preventScroll: true });
    }

    renderResult(entry, result, record) {
        const { panel } = this.els;
        clear(panel);
        panel.hidden = false;
        this.els.hud.hidden = true;
        this.els.stageWrap.hidden = true;

        const rows = [
            entry.accuracy != null && ['Doğruluk', `%${Math.round(entry.accuracy * 100)}`],
            entry.level != null && ['Ulaşılan seviye', entry.level],
            ['Süre', formatTime(entry.durationMs)],
            ...(result.details || []),
        ].filter(Boolean);

        const buttons = [h('button', { class: 'btn btn-primary', onclick: () => this.start() }, '↻ Tekrar oyna')];
        let workoutNote = null;
        if (this.workoutIndex != null && !this.zen) {
            const next = this.workout.nextIndex();
            if (next != null) buttons.unshift(h('button', { class: 'btn btn-primary', onclick: () => this.navigate(`#/antrenman/${next}`) }, 'Sonraki antrenman oyunu →'));
            else workoutNote = h('p', { class: 'workout-done' }, '🎉 Bugünkü antrenmanı tamamladın! Profilinde sonuçlarını görebilirsin.');
        }
        buttons.push(h('button', { class: 'btn', onclick: () => this.navigate('#/') }, 'Oyunlara dön'));

        panel.append(h('div', { class: 'card result-card' },
            this.workoutTag(),
            h('h3', {}, this.zen ? 'Zen oturumu bitti' : 'Oyun bitti'),
            record?.isBest && h('p', { class: 'record' }, `🏆 Yeni rekor! (önceki: ${record.previousBest.score})`),
            h('p', { class: 'result-score' }, h('span', { class: 'result-number' }, entry.score), ' puan'),
            this.zen
                ? h('p', { class: 'muted' }, 'Zen modunda skor kaydedilmez.')
                : h('div', { class: 'meter-block' },
                    h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': entry.normalized, 'aria-label': 'Performans puanı' },
                        h('div', { class: 'meter-fill', style: { width: `${entry.normalized}%` } })),
                    h('p', { class: 'muted' }, `Performans puanı: ${entry.normalized}/100 (profilinde kullanılır)`)),
            h('dl', { class: 'result-details' }, rows.map(([label, value]) => [h('dt', {}, label), h('dd', {}, value)])),
            result.notes?.length && h('div', { class: 'notes' },
                h('h4', {}, result.notesTitle || 'Notlar'),
                h('ul', {}, result.notes.map(note => h('li', {}, note)))),
            workoutNote,
            h('div', { class: 'btn-row' }, buttons)));
        panel.querySelector('.btn-primary').focus({ preventScroll: true });
        panel.scrollIntoView?.({ block: 'nearest' });
    }
}
