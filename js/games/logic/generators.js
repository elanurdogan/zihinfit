// Süreli oyunların soru üreticileri (saf fonksiyonlar, birim testli).

// ---------- Sayı Fırtınası ----------
export function generateEquation(rng, level) {
    let a, b, op, result;
    const kind = level <= 1 ? '+' : level === 2 ? rng.pick(['+', '-']) : level === 3 ? rng.pick(['+', '-', '×']) : rng.pick(['+', '-', '×', '÷']);
    const big = level >= 5;
    if (kind === '+') { a = rng.int(1, big ? 60 : 12); b = rng.int(1, big ? 40 : 12); result = a + b; }
    else if (kind === '-') { a = rng.int(5, big ? 90 : 20); b = rng.int(1, a); result = a - b; }
    else if (kind === '×') { a = rng.int(2, big ? 12 : 9); b = rng.int(2, 9); result = a * b; }
    else { b = rng.int(2, 9); result = rng.int(2, big ? 12 : 9); a = b * result; }
    op = kind;
    const isTrue = rng.chance(0.5);
    let shown = result;
    if (!isTrue) {
        const offsets = result >= 20 ? [-10, -2, -1, 1, 2, 10] : [-2, -1, 1, 2, 3];
        do { shown = result + rng.pick(offsets); } while (shown < 0 || shown === result);
    }
    return { text: `${a} ${op} ${b} = ${shown}`, isTrue, answer: isTrue ? 'dogru' : 'yanlis' };
}

// ---------- Sürekli Dikkat (1-geri) ----------
export const SYMBOLS = [
    { id: 'daire', glyph: '●', color: '#E8590C' },
    { id: 'ucgen', glyph: '▲', color: '#1C7ED6' },
    { id: 'kare', glyph: '■', color: '#2B8A3E' },
    { id: 'yildiz', glyph: '★', color: '#AE3EC9' },
    { id: 'karo', glyph: '◆', color: '#C92A2A' },
    { id: 'arti', glyph: '✚', color: '#495057' },
];

export function nextSymbol(rng, previous, matchRate = 0.4) {
    if (previous && rng.chance(matchRate)) return previous;
    return rng.pick(SYMBOLS.filter(symbol => symbol !== previous));
}

// ---------- Renk Çatışması (Stroop) ----------
export const STROOP_COLORS = {
    normal: [
        { id: 'kirmizi', name: 'KIRMIZI', hex: '#FF6B6B' },
        { id: 'mavi', name: 'MAVİ', hex: '#4DABF7' },
        { id: 'yesil', name: 'YEŞİL', hex: '#51CF66' },
        { id: 'sari', name: 'SARI', hex: '#FFD43B' },
    ],
    // Okabe–Ito paleti: renk körlüğü tiplerinde ayırt edilebilir
    colorblind: [
        { id: 'turuncu', name: 'TURUNCU', hex: '#E69F00' },
        { id: 'mavi', name: 'MAVİ', hex: '#56B4E9' },
        { id: 'pembe', name: 'PEMBE', hex: '#CC79A7' },
        { id: 'beyaz', name: 'BEYAZ', hex: '#FFFFFF' },
    ],
};

export function makeStroopTrial(rng, level, palette) {
    const rule = level >= 2 && rng.chance(0.35) ? 'anlam' : 'renk';
    const wordColor = rng.pick(palette);
    const congruent = rng.chance(0.3);
    const ink = congruent ? wordColor : rng.pick(palette.filter(c => c !== wordColor));
    return { rule, word: wordColor, ink, answer: rule === 'renk' ? ink.id : wordColor.id };
}

// ---------- Kural Değiştir ----------
export const VOWELS = ['A', 'E', 'I', 'O', 'U', 'Ö', 'Ü'];
export const CONSONANTS = ['B', 'D', 'K', 'M', 'R', 'S', 'T'];

export function makeRuleTrial(rng, level, previousRule) {
    const switchChance = level >= 2 ? 0.5 : 0.3;
    const rule = previousRule && !rng.chance(switchChance) ? previousRule : rng.pick(['sayi', 'harf']);
    const number = rng.int(1, 9);
    const letter = rng.pick(rng.chance(0.5) ? VOWELS : CONSONANTS);
    const yes = rule === 'sayi' ? number % 2 === 0 : VOWELS.includes(letter);
    return { rule, number, letter, switched: !!previousRule && previousRule !== rule, answer: yes ? 'evet' : 'hayir' };
}
