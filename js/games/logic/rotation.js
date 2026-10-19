// Zihinsel Döndürme için şekiller. Hepsi "kiral" pentominolardır: ayna görüntüsü hiçbir döndürmeyle
// kendisine eşit olmaz; böylece "aynı mı / ayna mı" sorusunun her zaman tek doğru cevabı vardır.

export const SHAPES = {
    F: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
    L: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
    N: [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]],
    P: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
    Y: [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]],
    Z: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]],
};

export function normalizeCells(cells) {
    const minX = Math.min(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    return cells.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
export const rotate90 = cells => normalizeCells(cells.map(([x, y]) => [-y, x]));
export const mirror = cells => normalizeCells(cells.map(([x, y]) => [-x, y]));
const key = cells => JSON.stringify(normalizeCells(cells));

export function rotations(cells) {
    const out = [normalizeCells(cells)];
    for (let i = 0; i < 3; i++) out.push(rotate90(out[out.length - 1]));
    return out;
}

export function isChiral(cells) {
    const mirrored = key(mirror(cells));
    return rotations(cells).every(rot => key(rot) !== mirrored);
}

export function makeRotationTrial(rng, level) {
    const name = rng.pick(Object.keys(SHAPES));
    const step = level >= 3 ? 45 : 90;
    const angle = rng.int(0, 360 / step - 1) * step;
    const mirrored = rng.chance(0.5);
    const leftAngle = level >= 5 ? rng.int(0, 3) * 90 : 0;
    return { name, cells: SHAPES[name], angle, leftAngle, mirrored, answer: mirrored ? 'ayna' : 'ayni' };
}
