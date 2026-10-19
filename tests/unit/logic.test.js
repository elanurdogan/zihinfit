import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../../js/core/rng.js';
import { generateFusePuzzle, findSolutions, applyOp } from '../../js/games/logic/fuse.js';
import { scoreGuess, generateCode, ROUNDS } from '../../js/games/logic/codeBreaker.js';
import { SHAPES, isChiral, rotations, mirror, makeRotationTrial } from '../../js/games/logic/rotation.js';
import { generateEquation, nextSymbol, SYMBOLS, makeStroopTrial, STROOP_COLORS, makeRuleTrial, VOWELS } from '../../js/games/logic/generators.js';
import { WORD_CATEGORIES, FILLERS } from '../../js/data/words.js';
import { matrixLevel } from '../../js/games/memoryMatrix.js';

test('rng: aynı tohum aynı diziyi üretir, farklı tohum farklı', () => {
    const a = createRng('lumo'), b = createRng('lumo'), c = createRng('baska');
    const seqA = Array.from({ length: 20 }, () => a.next());
    assert.deepEqual(seqA, Array.from({ length: 20 }, () => b.next()));
    assert.notDeepEqual(seqA, Array.from({ length: 20 }, () => c.next()));
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
        const n = rng.int(3, 7);
        assert.ok(n >= 3 && n <= 7 && Number.isInteger(n));
    }
    assert.deepEqual(rng.shuffle([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
});

test('Sayı Füzyonu: her soruda tam olarak bir doğru çift ve farklı sayılar var (feedback: "başka doğru cevabı kabul etmiyor")', () => {
    const rng = createRng('fuse');
    for (let level = 1; level <= 30; level++) {
        for (let i = 0; i < 60; i++) {
            const p = generateFusePuzzle(rng, level);
            assert.equal(p.options.length, 6);
            assert.equal(new Set(p.options).size, 6, 'sayılar tekrar etmemeli');
            const solutions = findSolutions(p.options, p.op, p.target);
            assert.equal(solutions.length, 1, `seviye ${level}: ${p.options} ${p.op} ${p.target}`);
            assert.deepEqual(solutions[0], p.answer);
            assert.equal(applyOp(p.op, p.options[p.answer[0]], p.options[p.answer[1]]), p.target);
        }
    }
});

test('Şifre Çözücü: puanlama tekrarlı rakamlarda da doğru', () => {
    assert.deepEqual(scoreGuess([1, 2, 3], [1, 2, 3]), { exact: 3, partial: 0 });
    assert.deepEqual(scoreGuess([1, 2, 3], [3, 1, 2]), { exact: 0, partial: 3 });
    assert.deepEqual(scoreGuess([1, 2, 3, 4], [1, 3, 5, 6]), { exact: 1, partial: 1 });
    assert.deepEqual(scoreGuess([1, 1, 2, 2], [1, 2, 1, 1]), { exact: 1, partial: 2 });
    assert.deepEqual(scoreGuess([5, 5, 5, 5], [5, 1, 1, 1]), { exact: 1, partial: 0 });
    const rng = createRng('code');
    for (const round of ROUNDS) {
        for (let i = 0; i < 50; i++) {
            const code = generateCode(rng, round);
            assert.equal(code.length, round.length);
            assert.ok(code.every(d => d >= 1 && d <= round.digits));
            if (!round.repeats) assert.equal(new Set(code).size, code.length);
        }
    }
});

test('Zihinsel Döndürme: tüm şekiller kiral, cevap her zaman tek', () => {
    for (const [name, cells] of Object.entries(SHAPES)) {
        assert.ok(isChiral(cells), `${name} kiral olmalı`);
        assert.equal(rotations(cells).length, 4);
        assert.ok(!rotations(cells).some(r => JSON.stringify(r) === JSON.stringify(mirror(cells))));
    }
    const rng = createRng('rot');
    for (let level = 1; level <= 6; level++) {
        const t = makeRotationTrial(rng, level);
        assert.equal(t.answer, t.mirrored ? 'ayna' : 'ayni');
        assert.equal(t.angle % (level >= 3 ? 45 : 90), 0);
    }
});

test('Sayı Fırtınası: denklem doğruluğu metinle tutarlı, sonuç negatif değil', () => {
    const rng = createRng('math');
    for (let level = 1; level <= 6; level++) {
        for (let i = 0; i < 300; i++) {
            const eq = generateEquation(rng, level);
            const [, a, op, b, shown] = eq.text.match(/^(\d+) (\S) (\d+) = (\d+)$/);
            const x = Number(a), y = Number(b);
            const actual = op === '+' ? x + y : op === '-' ? x - y : op === '×' ? x * y : x / y;
            assert.ok(Number.isInteger(actual) && actual >= 0, eq.text);
            assert.equal(actual === Number(shown), eq.isTrue, eq.text);
        }
    }
});

test('Sürekli Dikkat: eşleşme oranı yaklaşık %40', () => {
    const rng = createRng('nback');
    let prev = null, same = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) {
        const next = nextSymbol(rng, prev);
        assert.ok(SYMBOLS.includes(next));
        if (prev && next === prev) same++;
        prev = next;
    }
    const rate = same / (n - 1);
    assert.ok(rate > 0.35 && rate < 0.45, `oran ${rate}`);
});

test('Renk Çatışması ve Kural Değiştir: cevap kurala uygun', () => {
    const rng = createRng('stroop');
    for (const palette of Object.values(STROOP_COLORS)) {
        for (let i = 0; i < 300; i++) {
            const t = makeStroopTrial(rng, 3, palette);
            assert.equal(t.answer, t.rule === 'renk' ? t.ink.id : t.word.id);
        }
    }
    assert.ok(Array.from({ length: 200 }, () => makeStroopTrial(rng, 1, STROOP_COLORS.normal)).every(t => t.rule === 'renk'), '1. seviyede yalnız renk kuralı');
    let prevRule = null;
    for (let i = 0; i < 500; i++) {
        const t = makeRuleTrial(rng, 3, prevRule);
        const expected = t.rule === 'sayi' ? t.number % 2 === 0 : VOWELS.includes(t.letter);
        assert.equal(t.answer, expected ? 'evet' : 'hayir');
        assert.equal(t.switched, !!prevRule && prevRule !== t.rule);
        prevRule = t.rule;
    }
});

test('Kelime Bağlamı sözlüğü: her kelime tek kategoride, dolgu kelimeleri hiçbir kategoride değil', () => {
    const seen = new Map();
    let total = 0;
    for (const [cat, entries] of Object.entries(WORD_CATEGORIES)) {
        assert.ok(entries.length >= 9, `${cat} en az 9 kelime`);
        for (const { word, meaning } of entries) {
            total++;
            assert.ok(word && word === word.trim() && !word.includes('|'));
            if (meaning !== undefined) assert.ok(meaning.length > 5);
            assert.ok(!seen.has(word), `"${word}" hem ${seen.get(word)} hem ${cat}`);
            seen.set(word, cat);
        }
    }
    for (const filler of FILLERS) assert.ok(!seen.has(filler), `dolgu "${filler}" bir kategoride`);
    assert.ok(total >= 200, `sözlük ${total} kelime`);
});

test('Hafıza Matrisi: kare sayısı ızgaraya sığar ve seviyeyle artar', () => {
    let prev = 0;
    for (let level = 1; level <= 20; level++) {
        const { size, tiles } = matrixLevel(level);
        assert.ok(tiles < size * size);
        assert.ok(tiles >= prev);
        prev = tiles;
    }
});
