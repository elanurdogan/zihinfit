// Şifre Çözücü kuralları (Mastermind). Tekrarlı rakamlarda da doğru sayım yapar.

export function scoreGuess(code, guess) {
    let exact = 0;
    const codeRest = new Map(), guessRest = new Map();
    for (let i = 0; i < code.length; i++) {
        if (code[i] === guess[i]) exact++;
        else {
            codeRest.set(code[i], (codeRest.get(code[i]) || 0) + 1);
            guessRest.set(guess[i], (guessRest.get(guess[i]) || 0) + 1);
        }
    }
    let partial = 0;
    for (const [digit, n] of guessRest) partial += Math.min(n, codeRest.get(digit) || 0);
    return { exact, partial };
}

export function generateCode(rng, { length, digits, repeats }) {
    const pool = Array.from({ length: digits }, (_, i) => i + 1);
    if (!repeats) return rng.sample(pool, length);
    return Array.from({ length }, () => rng.pick(pool));
}

export const ROUNDS = [
    { length: 3, digits: 5, repeats: false },
    { length: 4, digits: 6, repeats: false },
    { length: 4, digits: 6, repeats: true },
];
export const MAX_GUESSES = 8;
