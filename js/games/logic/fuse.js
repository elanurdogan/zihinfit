// Sayı Füzyonu soru üreticisi. Tek doğru çözüm garantisi burada sağlanır:
// 6 sayı arasında hedefe ulaşan yalnızca bir çift bulunur ve tüm sayılar birbirinden farklıdır.

export const applyOp = (op, a, b) => (op === 'sum' ? a + b : a * b);

export function findSolutions(options, op, target) {
    const pairs = [];
    for (let i = 0; i < options.length; i++) {
        for (let j = i + 1; j < options.length; j++) {
            if (applyOp(op, options[i], options[j]) === target) pairs.push([i, j]);
        }
    }
    return pairs;
}

export function generateFusePuzzle(rng, level, count = 6) {
    const op = level >= 3 && rng.chance(0.4) ? 'multiply' : 'sum';
    for (let attempt = 0; attempt < 500; attempt++) {
        let a, b, maxOption;
        if (op === 'sum') {
            const max = Math.min(60, 9 + level * 3);
            a = rng.int(1, max);
            b = rng.int(1, max);
            maxOption = max + 6;
        } else {
            const max = Math.min(12, 5 + Math.floor(level / 2));
            a = rng.int(2, max);
            b = rng.int(2, max);
            maxOption = max + 6;
        }
        if (a === b) continue;
        const target = applyOp(op, a, b);
        const options = [a, b];
        for (let guard = 0; options.length < count && guard < 500; guard++) {
            const candidate = rng.int(op === 'sum' ? 1 : 2, maxOption);
            if (options.includes(candidate)) continue;
            if (options.some(existing => applyOp(op, existing, candidate) === target)) continue;
            options.push(candidate);
        }
        if (options.length < count) continue;
        const shuffled = rng.shuffle(options);
        const solutions = findSolutions(shuffled, op, target);
        if (solutions.length === 1) return { op, target, options: shuffled, answer: solutions[0] };
    }
    throw new Error('Sayı Füzyonu sorusu üretilemedi');
}
