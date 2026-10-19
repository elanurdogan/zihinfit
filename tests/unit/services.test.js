import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../../js/core/rng.js';
import { createClock } from '../../js/core/clock.js';
import { createMultiplier } from '../../js/core/trialSession.js';
import { createStorage, memoryBackend, PREFIX } from '../../js/services/storage.js';
import { createScoreService } from '../../js/services/scores.js';
import { createSettings } from '../../js/services/settings.js';
import { buildWorkout, swapGame, createWorkoutService } from '../../js/services/workout.js';
import { buildProfile, normalizeResult } from '../../js/services/analysis.js';

const CATEGORIES = ['a', 'b', 'c', 'd', 'e'].map(key => ({ key, label: key.toUpperCase() }));
const GAMES = CATEGORIES.flatMap(cat => [1, 2, 3].map(n => ({ id: `${cat.key}${n}`, title: `${cat.key}${n}`, category: cat.key, scoreRef: 100 })));

test('clock: duraklatınca zaman ve zamanlayıcılar durur, destroy her şeyi temizler', () => {
    const clock = createClock({ requestFrame: null });
    const log = [];
    clock.after(100, () => log.push('after'));
    const stop = clock.every(50, () => log.push('every'));
    clock.tick(60);
    assert.deepEqual(log, ['every']);
    clock.pause();
    clock.tick(1000);
    assert.equal(clock.now, 60);
    assert.deepEqual(log, ['every']);
    clock.resume();
    clock.tick(50);
    assert.deepEqual(log, ['every', 'after', 'every'], 'aynı anda dolanlar kuruluş sırasıyla çalışır');
    stop();
    clock.tick(500);
    assert.equal(log.length, 3);
    const frames = [];
    clock.onFrame(dt => frames.push(dt));
    clock.after(10, () => log.push('late'));
    clock.destroy();
    clock.tick(100);
    assert.deepEqual(frames, []);
    assert.equal(log.length, 3);
});

test('çarpan: her 5 doğruda artar, hata sıfırlar, en fazla ×4', () => {
    const m = createMultiplier();
    const gained = Array.from({ length: 21 }, () => m.hit());
    assert.deepEqual(gained.slice(0, 6), [1, 1, 1, 1, 1, 2]);
    assert.equal(gained[20], 4);
    m.miss();
    assert.equal(m.value, 1);
});

test('storage: versiyonlu anahtar, bozuk veride varsayılana düşer', () => {
    const backend = memoryBackend();
    const storage = createStorage(backend);
    storage.set('x', { a: 1 });
    assert.equal(backend.getItem(`${PREFIX}x`), '{"a":1}');
    assert.deepEqual(storage.get('x'), { a: 1 });
    backend.setItem(`${PREFIX}bozuk`, '{oops');
    assert.equal(storage.get('bozuk', 'varsayilan'), 'varsayilan');
    backend.setItem('baska:anahtar', '1');
    storage.clearAll();
    assert.equal(storage.get('x'), undefined);
    assert.equal(backend.getItem('baska:anahtar'), '1', 'başka uygulamaların verisine dokunmaz');
});

test('skorlar: en iyi skor, oynanma sayısı ve sınırlı geçmiş', () => {
    const scores = createScoreService(createStorage(memoryBackend()));
    const first = scores.record('g', { score: 50, normalized: 50 });
    assert.equal(first.firstPlay, true);
    assert.equal(first.isBest, false, 'ilk oyun "yeni rekor" sayılmaz');
    assert.equal(scores.record('g', { score: 40, normalized: 40 }).isBest, false);
    assert.equal(scores.record('g', { score: 70, normalized: 70 }).isBest, true);
    for (let i = 0; i < 60; i++) scores.record('g', { score: 1, normalized: 1 });
    const stats = scores.stats('g');
    assert.equal(stats.best.score, 70);
    assert.equal(stats.plays, 63);
    assert.equal(stats.history.length, 50);
});

test('ayarlar: kalıcı ve dinlenebilir', () => {
    const storage = createStorage(memoryBackend());
    const settings = createSettings(storage);
    let seen = null;
    settings.subscribe(state => { seen = state.colorblind; });
    settings.set('colorblind', true);
    assert.equal(seen, true);
    assert.equal(createSettings(storage).get('colorblind'), true);
    settings.set('reducedMotion', true);
    assert.equal(settings.reducedMotion(), true);
});

test('antrenman: her kategoriden bir oyun, yakın zamanda oynananlardan kaçınır, az oynananı seçer', () => {
    for (let s = 0; s < 50; s++) {
        const rng = createRng(s);
        const recent = ['a1', 'b1', 'c1'];
        const ids = buildWorkout({ games: GAMES, categories: CATEGORIES, rng, recentGameIds: recent, playCounts: { d1: 5, d2: 5 } });
        assert.equal(ids.length, 5);
        assert.deepEqual(ids.map(id => id[0]), ['a', 'b', 'c', 'd', 'e']);
        assert.ok(!ids.some(id => recent.includes(id)), 'son oynananlar tekrar gelmez');
        assert.ok(ids.includes('d3'), 'en az oynanan seçilir');
    }
    const all = GAMES.filter(g => g.category === 'a').map(g => g.id);
    const ids = buildWorkout({ games: GAMES, categories: CATEGORIES, rng: createRng(1), recentGameIds: all });
    assert.ok(all.includes(ids[0]), 'hepsi yakın zamanda oynanmışsa yine de bir oyun seçilir');
});

test('antrenman: değiştirme aynı kategoride farklı bir oyun verir', () => {
    const workoutIds = ['a1', 'b1', 'c1', 'd1', 'e1'];
    for (let s = 0; s < 30; s++) {
        const id = swapGame({ workoutIds, index: 2, games: GAMES, rng: createRng(s) });
        assert.ok(['c2', 'c3'].includes(id));
    }
});

test('antrenman servisi: günü saklar, değiştirir, tamamlananı işaretler', () => {
    const storage = createStorage(memoryBackend());
    const scores = createScoreService(storage);
    const service = createWorkoutService({ storage, games: GAMES, categories: CATEGORIES, scores, seed: 'test' });
    const today = service.today();
    assert.equal(today.slots.length, 5);
    assert.deepEqual(service.today().slots, today.slots, 'aynı gün aynı antrenman');
    const before = today.slots[1].gameId;
    const after = service.swap(1);
    assert.notEqual(after, before);
    assert.equal(after[0], before[0]);
    service.markDone(0, today.slots[0].gameId, 80);
    assert.equal(service.today().slots[0].done, true);
    assert.equal(service.swap(0), null, 'tamamlanan oyun değiştirilemez');
    assert.equal(service.nextIndex(), 1);
    service.markDone(3, 'yanlis-oyun', 50);
    assert.equal(service.today().slots[3].done, false, 'yanlış oyun kimliği işaretlenmez');
});

test('analiz: puanlar 0–100 arasında, kategori ortalaması ve en güçlü/zayıf alan', () => {
    assert.equal(normalizeResult({ scoreRef: 200 }, { score: 100 }), 50);
    assert.equal(normalizeResult({ scoreRef: 200 }, { score: 900 }), 100);
    assert.equal(normalizeResult({ scoreRef: 200 }, { score: -5 }), 0);
    assert.equal(normalizeResult({ normalize: r => r.accuracy * 100 }, { accuracy: 0.42 }), 42);
    assert.equal(normalizeResult({ normalize: () => NaN }, {}), 0);

    const entry = n => ({ score: n, normalized: n });
    const scoresAll = {
        a1: { plays: 6, best: entry(90), history: [10, 90, 90, 90, 90, 90].map(entry) },
        a2: { plays: 1, best: entry(70), history: [entry(70)] },
        c1: { plays: 1, best: entry(30), history: [entry(30)] },
    };
    const profile = buildProfile({ games: GAMES, categories: CATEGORIES, scoresAll });
    assert.equal(profile.games.find(g => g.id === 'a1').value, 90, 'son 5 sonuç');
    assert.equal(profile.categories.find(c => c.key === 'a').value, 80);
    assert.equal(profile.categories.find(c => c.key === 'b').value, null);
    assert.equal(profile.overall, 55);
    assert.equal(profile.strongest.key, 'a');
    assert.equal(profile.weakest.key, 'c');
    assert.equal(profile.coveredCategories, 2);
    assert.equal(profile.playedGames, 3);
});
